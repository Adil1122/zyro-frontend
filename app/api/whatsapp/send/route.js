import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { phone, message, conversationId } = await request.json();
        if (!phone || !message?.trim()) {
            return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
        }

        const { data: user } = await supabase
            .from('users')
            .select('wa_phone_number_id, wa_access_token, wa_is_active')
            .eq('id', userId)
            .single();

        if (!user?.wa_phone_number_id || !user?.wa_access_token) {
            return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 });
        }
        if (!user.wa_is_active) {
            return NextResponse.json({ error: 'WhatsApp is disabled' }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v18.0/${user.wa_phone_number_id}/messages`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.wa_access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: { body: message.trim() },
            }),
        });

        const responseBody = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ error: responseBody?.error?.message || 'Meta API error' }, { status: 502 });
        }

        const messageId = responseBody?.messages?.[0]?.id || null;

        // Save to wa_messages and update conversation last_message
        if (conversationId) {
            await supabase.from('wa_messages').insert({
                conversation_id: conversationId,
                user_id: userId,
                sender_type: 'agent',
                message_text: message.trim(),
            });
            await supabase.from('wa_conversations')
                .update({ last_message: message.trim(), updated_at: new Date().toISOString() })
                .eq('id', conversationId);
        }

        return NextResponse.json({ success: true, messageId });
    } catch (error) {
        console.error('[WhatsApp Send Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
