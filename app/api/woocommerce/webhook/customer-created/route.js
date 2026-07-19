import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const wcCustomer = await request.json();
        if (!wcCustomer?.id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        const email = wcCustomer.email || '';
        const name = `${wcCustomer.first_name || ''} ${wcCustomer.last_name || ''}`.trim() || wcCustomer.username || 'Guest';
        const billing = wcCustomer.billing || {};
        const phone = billing.phone || '';
        const city = billing.city || '';

        console.log(`[WC customer.created] ${name} (${email})`);

        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .eq('email', email)
            .maybeSingle();

        if (existing?.id) {
            await supabase.from('customers').update({ name, contact: phone || email, city }).eq('id', existing.id);
            return NextResponse.json({ success: true, customerId: existing.id, action: 'updated' });
        }

        const { data: newCustomer, error } = await supabase.from('customers').insert({
            user_id: userId,
            name,
            email,
            contact: phone || email,
            city,
            total_orders: 0,
            total_spent: 0,
            status: 'active',
        }).select('id').single();

        if (error) throw error;

        return NextResponse.json({ success: true, customerId: newCustomer.id, action: 'created' });

    } catch (error) {
        console.error('[WC customer.created Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
