import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { userId, data } = await request.json();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'No data to import' }, { status: 400 });
        }

        let imported = 0;
        let skipped = 0;

        for (const row of data) {
            try {
                const customerName = row.Customer || row.customer || 'Walk-in';
                const customerPhone = String(row.Phone || row.phone || '').trim();
                const city = String(row.City || row.city || '').trim();
                const orderId = String(row.OrderID || row.order_id || `IMP-${Date.now()}-${imported}`).trim();
                const amount = parseFloat(row.Amount || row.amount || 0);
                const status = (row.Status || row.status || 'pending').toLowerCase();

                // Upsert customer if phone given
                let customerId = null;
                if (customerPhone) {
                    const { data: existCust } = await supabase
                        .from('customers').select('id')
                        .eq('user_id', userId).eq('contact', customerPhone).maybeSingle();
                    if (existCust?.id) {
                        customerId = existCust.id;
                    } else {
                        const { data: newCust } = await supabase.from('customers').insert({
                            user_id: userId, name: customerName,
                            contact: customerPhone, city, status: 'active',
                        }).select('id').single();
                        customerId = newCust?.id || null;
                    }
                }

                // Check if order ID already exists
                const { data: existing } = await supabase
                    .from('orders').select('id')
                    .eq('user_id', userId).eq('order_id', orderId).maybeSingle();

                if (existing?.id) {
                    await supabase.from('orders').update({ status, total_amount: amount }).eq('id', existing.id);
                } else {
                    await supabase.from('orders').insert({
                        user_id: userId, customer_id: customerId,
                        order_id: orderId, status, total_amount: amount,
                    });
                    imported++;
                }
            } catch {
                skipped++;
            }
        }

        return NextResponse.json({ success: true, imported, skipped, total: data.length });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
