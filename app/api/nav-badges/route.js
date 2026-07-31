import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ orders: 0, whatsapp: 0, inventory: 0 });

    try {
        const [ordersResult, waResult, stockResult] = await Promise.all([
            // Pending orders needing courier booking
            supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .in('status', ['pending', 'new']),

            // Open support tickets (escalated WA conversations)
            supabase
                .from('support_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'open'),

            // Low-stock products
            supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .lt('stock', 5)
                .gte('stock', 0),
        ]);

        return NextResponse.json({
            orders: ordersResult.count || 0,
            whatsapp: waResult.count || 0,
            inventory: stockResult.count || 0,
        });
    } catch {
        return NextResponse.json({ orders: 0, whatsapp: 0, inventory: 0 });
    }
}
