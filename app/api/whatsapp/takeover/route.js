import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { conversationId } = await request.json();
        if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });

        const { error } = await supabase
            .from('wa_conversations')
            .update({ status: 'manual_support', updated_at: new Date().toISOString() })
            .eq('id', conversationId)
            .eq('user_id', userId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
