import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_REPLIES = [
    { label: 'Issue refund',    text: 'We\'re processing your refund. Please allow 3-5 business days for the amount to reflect in your account.' },
    { label: 'Send new item',   text: 'We\'re sending you a replacement item. You\'ll receive a tracking number shortly.' },
    { label: 'Schedule pickup', text: 'We\'ve scheduled a pickup for your return. Our courier will contact you within 24 hours.' },
    { label: 'Offer discount',  text: 'As a goodwill gesture, here\'s a 15% discount on your next order.' },
];

export async function GET(request) {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('wa_settings')
            .select('quick_replies')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ replies: data?.quick_replies || DEFAULT_REPLIES });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { replies } = await request.json();
        if (!Array.isArray(replies)) return NextResponse.json({ error: 'replies must be an array' }, { status: 400 });

        const { error } = await supabase
            .from('wa_settings')
            .upsert({ user_id: userId, quick_replies: replies, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
