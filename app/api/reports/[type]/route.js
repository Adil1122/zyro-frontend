import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function dateRange(range) {
    const now = new Date();
    const from = new Date(now);
    if (range === '7d') from.setDate(now.getDate() - 7);
    else if (range === '30d') from.setDate(now.getDate() - 30);
    else if (range === '90d') from.setDate(now.getDate() - 90);
    else if (range === 'month') { from.setDate(1); from.setHours(0, 0, 0, 0); }
    else return null; // all time
    return from.toISOString();
}

function csvRow(arr) {
    return arr.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
}

function buildCsv(headers, rows) {
    return [csvRow(headers), ...rows.map(csvRow)].join('\n');
}

export async function GET(request, { params }) {
    const { type } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '30d';

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const from = dateRange(range);

    try {
        let csv = '';

        if (type === 'orders') {
            let q = supabase.from('orders').select('order_id, status, total_amount, payment_type, courier_name, address, created_at, customers(name, contact, city)').eq('user_id', userId).order('created_at', { ascending: false });
            if (from) q = q.gte('created_at', from);
            const { data, error } = await q;
            if (error) throw error;
            csv = buildCsv(
                ['Order ID', 'Date', 'Customer', 'Phone', 'City', 'Status', 'Amount', 'Payment', 'Courier'],
                (data || []).map(o => [
                    o.order_id, new Date(o.created_at).toLocaleDateString(),
                    o.customers?.name || '', o.customers?.contact || '', o.customers?.city || o.address || '',
                    o.status, o.total_amount || 0, o.payment_type || 'cod', o.courier_name || '',
                ])
            );

        } else if (type === 'revenue') {
            let q = supabase.from('orders').select('total_amount, payment_type, status, created_at').eq('user_id', userId).order('created_at', { ascending: false });
            if (from) q = q.gte('created_at', from);
            const { data, error } = await q;
            if (error) throw error;
            // Group by date
            const byDate = {};
            for (const o of (data || [])) {
                const d = o.created_at?.slice(0, 10) || '?';
                if (!byDate[d]) byDate[d] = { date: d, orders: 0, gross: 0, cod: 0, prepaid: 0, delivered: 0 };
                byDate[d].orders++;
                byDate[d].gross += o.total_amount || 0;
                if ((o.payment_type || '').toLowerCase().includes('cod')) byDate[d].cod += o.total_amount || 0;
                else byDate[d].prepaid += o.total_amount || 0;
                if (['delivered', 'completed'].includes((o.status || '').toLowerCase())) byDate[d].delivered += o.total_amount || 0;
            }
            csv = buildCsv(
                ['Date', 'Orders', 'Gross Revenue', 'COD Revenue', 'Prepaid Revenue', 'Delivered Revenue'],
                Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).map(r => [r.date, r.orders, r.gross, r.cod, r.prepaid, r.delivered])
            );

        } else if (type === 'customers') {
            const { data, error } = await supabase.from('customers').select('name, contact, email, city, created_at, orders(total_amount)').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            csv = buildCsv(
                ['Name', 'Phone', 'Email', 'City', 'Joined', 'Orders', 'Total Spent', 'Tier'],
                (data || []).map(c => {
                    const orders = c.orders || [];
                    const spent = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
                    const tier = spent > 20000 ? 'VIP' : orders.length >= 3 || spent > 5000 ? 'Regular' : orders.length > 0 ? 'Watch' : 'New';
                    return [c.name, c.contact || '', c.email || '', c.city || '', c.created_at?.slice(0, 10), orders.length, spent, tier];
                })
            );

        } else if (type === 'courier') {
            let q = supabase.from('orders').select('courier_name, status, total_amount, payment_type').eq('user_id', userId);
            if (from) q = q.gte('created_at', from);
            const { data, error } = await q;
            if (error) throw error;
            const byCourier = {};
            for (const o of (data || [])) {
                const k = o.courier_name || 'Unassigned';
                if (!byCourier[k]) byCourier[k] = { name: k, orders: 0, delivered: 0, returned: 0, cod: 0 };
                byCourier[k].orders++;
                if (['delivered', 'completed'].includes((o.status || '').toLowerCase())) byCourier[k].delivered++;
                if (['returned', 'rto'].includes((o.status || '').toLowerCase())) byCourier[k].returned++;
                if ((o.payment_type || '').toLowerCase().includes('cod')) byCourier[k].cod += o.total_amount || 0;
            }
            csv = buildCsv(
                ['Courier', 'Total Orders', 'Delivered', 'Returned', 'COD Collected (Rs)', 'Success Rate'],
                Object.values(byCourier).sort((a, b) => b.orders - a.orders).map(r => [
                    r.name, r.orders, r.delivered, r.returned, r.cod,
                    r.orders > 0 ? `${Math.round(r.delivered / r.orders * 100)}%` : '—',
                ])
            );

        } else if (type === 'inventory') {
            const { data, error } = await supabase.from('products').select('name, sku, stock, reorder_point, category, updated_at').eq('user_id', userId).order('stock', { ascending: true });
            if (error) throw error;
            csv = buildCsv(
                ['Product Name', 'SKU', 'Stock', 'Reorder Point', 'Category', 'Status', 'Last Updated'],
                (data || []).map(p => {
                    const s = p.stock ?? 0;
                    const rp = p.reorder_point ?? 10;
                    const status = s === 0 ? 'Out of Stock' : s <= rp ? 'Low Stock' : 'OK';
                    return [p.name, p.sku || '', s, rp, p.category || '', status, p.updated_at?.slice(0, 10)];
                })
            );

        } else {
            return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
        }

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="zyro-${type}-report.csv"`,
            },
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
