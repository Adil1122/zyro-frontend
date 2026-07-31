import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Orders this month
        const { count: ordersThisMonth } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', monthStart);

        // WA messages this month (notification_logs = outbound)
        const { count: waMessagesThisMonth } = await supabase
            .from('notification_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', monthStart);

        // Team members (users with same account — just count 1 for now unless there's a team table)
        // This is a simplification; could be extended with a team_members table
        const teamCount = 1;

        return NextResponse.json({
            ordersThisMonth: ordersThisMonth || 0,
            waMessagesThisMonth: waMessagesThisMonth || 0,
            teamCount,
        });
    } catch (error) {
        return NextResponse.json({ ordersThisMonth: 0, waMessagesThisMonth: 0, teamCount: 1 });
    }
}
