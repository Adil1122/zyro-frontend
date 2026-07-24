import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let wcCustomer;
        try {
            wcCustomer = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }
        if (!wcCustomer?.id) return NextResponse.json({ success: true, message: 'Ping received' });

        const email = wcCustomer.email || '';
        const name = `${wcCustomer.first_name || ''} ${wcCustomer.last_name || ''}`.trim() || wcCustomer.username || 'Guest';
        const billing = wcCustomer.billing || {};
        const phone = billing.phone || '';
        const city = billing.city || '';

        console.log(`[WC customer.updated] ${name} (${email})`);

        // Find by email first, fallback to phone
        let existing = null;
        if (email) {
            const { data } = await supabase.from('customers').select('id').eq('user_id', userId).eq('email', email).maybeSingle();
            existing = data;
        }
        if (!existing && phone) {
            const { data } = await supabase.from('customers').select('id').eq('user_id', userId).eq('contact', phone).maybeSingle();
            existing = data;
        }

        if (!existing?.id) {
            return NextResponse.json({ success: true, message: 'Customer not in Zyro — skipped' });
        }

        const { error } = await supabase.from('customers').update({
            name,
            email,
            contact: phone || email,
            city,
        }).eq('id', existing.id);

        if (error) throw error;

        return NextResponse.json({ success: true, customerId: existing.id, action: 'updated' });

    } catch (error) {
        console.error('[WC customer.updated Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
