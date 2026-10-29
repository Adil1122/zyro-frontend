import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        let userId = request.headers.get('x-user-id');
        if (!userId) {
            // Fallback to active tenant user from database if not authenticated in browser session
            const { data: defaultUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
            userId = defaultUser?.id || 'e5940095-1560-4425-ab60-f8fc5f7874f4';
        }

        const body = await request.json();
        const { phone, message, conversationId, senderType, simulateReply } = body;
        const trimmedMessage = (message || '').trim();

        if (!trimmedMessage) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        // 1. Resolve or create active conversation (supports numeric IDs like 4 as well as UUIDs)
        let activeConvId = conversationId;
        if (!activeConvId || activeConvId === 'support-official') {
            const { data: existingConv } = await supabase
                .from('wa_conversations')
                .select('id')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingConv?.id) {
                activeConvId = existingConv.id;
            } else {
                const targetPhone = phone || '923001234567';
                const { data: newConv } = await supabase
                    .from('wa_conversations')
                    .insert({
                        user_id: userId,
                        phone_number: targetPhone,
                        status: 'manual_support',
                        last_message: trimmedMessage,
                    })
                    .select('id')
                    .maybeSingle();

                if (newConv?.id) {
                    activeConvId = newConv.id;
                }
            }
        }

        // 2. Fetch User Meta credentials for live WhatsApp sending
        const { data: user } = await supabase
            .from('users')
            .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone')
            .eq('id', userId)
            .maybeSingle();

        const recipientPhone = phone || user?.wa_merchant_phone;
        let metaMessageId = null;
        let metaError = null;

        // 3. Attempt live WhatsApp dispatch if credentials are configured
        if (user?.wa_phone_number_id && user?.wa_access_token && user?.wa_is_active !== false && recipientPhone && recipientPhone !== 'Support') {
            try {
                let cleanedPhone = recipientPhone.replace(/\D/g, '');
                if (cleanedPhone.startsWith('03')) cleanedPhone = '92' + cleanedPhone.substring(1);

                const url = `https://graph.facebook.com/v18.0/${user.wa_phone_number_id}/messages`;
                const metaRes = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.wa_access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: cleanedPhone,
                        type: 'text',
                        text: { body: trimmedMessage },
                    }),
                });

                const metaJson = await metaRes.json().catch(() => ({}));
                if (metaRes.ok && metaJson?.messages?.[0]?.id) {
                    metaMessageId = metaJson.messages[0].id;
                } else {
                    metaError = metaJson?.error?.message || `Meta API Status ${metaRes.status}`;
                    console.warn('[WhatsApp Send] Meta dispatch response:', metaError);
                }
            } catch (networkErr) {
                metaError = networkErr.message;
                console.warn('[WhatsApp Send] Network error calling Meta API:', networkErr.message);
            }
        } else {
            if (!user?.wa_phone_number_id || !user?.wa_access_token) {
                metaError = 'Meta credentials not configured in /settings/whatsapp';
            }
        }

        // 4. Save to wa_messages and update conversation in Supabase
        let savedMessage = null;
        if (activeConvId) {
            const { data: insertedMsg, error: insertErr } = await supabase
                .from('wa_messages')
                .insert({
                    conversation_id: activeConvId,
                    user_id: userId,
                    sender_type: senderType || 'merchant',
                    message_text: trimmedMessage,
                })
                .select()
                .maybeSingle();

            if (insertErr) {
                console.error('[WhatsApp Send] Insert into wa_messages error:', insertErr);
            } else {
                savedMessage = insertedMsg;
            }

            await supabase
                .from('wa_conversations')
                .update({ last_message: trimmedMessage, updated_at: new Date().toISOString() })
                .eq('id', activeConvId);

            // 5. If simulated reply is requested or testing two-way conversation
            if (simulateReply) {
                setTimeout(async () => {
                    try {
                        await supabase.from('wa_messages').insert({
                            conversation_id: activeConvId,
                            user_id: userId,
                            sender_type: 'agent',
                            message_text: `Thank you for reaching out! We received your message: "${trimmedMessage.substring(0, 45)}...". A Zyro support specialist is reviewing this.`,
                        });
                        await supabase.from('wa_conversations').update({
                            last_message: 'Support agent acknowledged your request.',
                            updated_at: new Date().toISOString()
                        }).eq('id', activeConvId);
                    } catch { /* non-fatal */ }
                }, 1000);
            }
        }

        return NextResponse.json({
            success: true,
            conversationId: activeConvId,
            message: savedMessage || {
                sender_type: senderType || 'merchant',
                message_text: trimmedMessage,
                created_at: new Date().toISOString()
            },
            messageId: metaMessageId,
            liveSent: Boolean(metaMessageId),
            warning: metaError ? `Note: ${metaError}. Message saved in conversation.` : null,
        });

    } catch (error) {
        console.error('[WhatsApp Send Fatal Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
