import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveTenantWhatsAppCredentials } from '@/lib/whatsappSession';

export async function POST(request) {
    try {
        let userId = request.headers.get('x-user-id');
        if (!userId) {
            // Fallback to active tenant user from database if not authenticated in browser session
            const { data: defaultUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
            userId = defaultUser?.id || 'e5940095-1560-4425-ab60-f8fc5f7874f4';
        }

        const body = await request.json().catch(() => ({}));
        const { phone, message, conversationId, targetUserId, senderType, simulateReply, useTemplate, templateName, languageCode } = body;
        const trimmedMessage = (message || '').trim() || (useTemplate ? `[Official Meta Template: ${templateName || 'hello_world'}]` : '');

        if (!trimmedMessage && !useTemplate) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        // Check if sending user is Zyro Admin
        const { data: userRecord } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        const isAdmin = Boolean(userRecord?.is_admin === true || (userRecord?.email || '').toLowerCase().trim() === 'admin@zyro.com');
        const effectiveSenderType = senderType || (isAdmin ? 'agent' : 'merchant');

        // 1. Resolve or create active conversation
        let activeConvId = conversationId;
        const targetOwnerId = (isAdmin && targetUserId)
            ? targetUserId
            : (String(activeConvId || '').startsWith('user-') ? activeConvId.replace('user-', '') : userId);

        if (!activeConvId || String(activeConvId).startsWith('user-') || activeConvId === 'support-official') {
            const { data: existingConv } = await supabase
                .from('wa_conversations')
                .select('id')
                .eq('user_id', targetOwnerId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingConv?.id) {
                activeConvId = existingConv.id;
            } else {
                const targetPhone = phone || (userRecord?.phone || '+923465629140');
                const { data: newConv } = await supabase
                    .from('wa_conversations')
                    .insert({
                        user_id: targetOwnerId,
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

        // 2. Resolve Meta credentials (Master Admin credentials)
        const creds = await resolveTenantWhatsAppCredentials(isAdmin ? userId : 'e5940095-1560-4425-ab60-f8fc5f7874f4');

        const recipientPhone = phone || (isAdmin ? '+923465629140' : '+1 (555) 167-0097');
        let metaMessageId = null;
        let metaError = null;

        const cleanRecipient = (recipientPhone || '').replace(/\D/g, '');
        const cleanSender = (creds.merchantPhone || '').replace(/\D/g, '');

        // Only dispatch live over Meta Cloud API when Admin is sending to a merchant phone (e.g. 923465629140)
        const isMerchantSendingToAdmin = !isAdmin || cleanRecipient === '15551670097';

        if (isAdmin && cleanRecipient && cleanRecipient !== '15551670097' && cleanRecipient !== cleanSender) {
            // Admin sending live message to Merchant phone over Meta Cloud API
            try {
                const graphVersion = process.env.META_GRAPH_API_VERSION || 'v26.0';
                const phoneNumberId = creds.phoneNumberId || '1462001326987017';
                const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
                const token = creds.accessToken || process.env.WA_SYSTEM_ACCESS_TOKEN;

                const metaPayload = useTemplate ? {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanRecipient,
                    type: 'template',
                    template: {
                        name: templateName || 'hello_world',
                        language: { code: languageCode || 'en_US' },
                    },
                } : {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanRecipient,
                    type: 'text',
                    text: { body: trimmedMessage },
                };

                const metaRes = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(metaPayload),
                });

                const metaJson = await metaRes.json().catch(() => ({}));
                if (metaRes.ok && metaJson?.messages?.[0]?.id) {
                    metaMessageId = metaJson.messages[0].id;
                } else {
                    const rawMsg = metaJson?.error?.message || `Meta API Status ${metaRes.status}`;
                    const errCode = metaJson?.error?.code;
                    const errSubcode = metaJson?.error?.error_subcode;

                    if (rawMsg.includes('131030') || errCode === 131030 || errSubcode === 131030) {
                        metaError = 'Meta Sandbox Restriction (#131030): Recipient is not in your allowed test list. In Meta Dashboard, add this number in WhatsApp > API Setup > To: "Manage phone number list".';
                    } else {
                        metaError = rawMsg;
                    }
                    console.warn('[WhatsApp Send] Meta dispatch response:', metaError);
                }
            } catch (networkErr) {
                metaError = networkErr.message;
                console.warn('[WhatsApp Send] Network error calling Meta API:', networkErr.message);
            }
        }

        // 3. Save to wa_messages and update conversation in Supabase
        let savedMessage = null;
        if (activeConvId) {
            const { data: insertedMsg, error: insertErr } = await supabase
                .from('wa_messages')
                .insert({
                    conversation_id: activeConvId,
                    user_id: targetOwnerId,
                    sender_type: effectiveSenderType,
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
            isPlatformManaged: creds.isUsingPlatformMaster,
            warning: metaError ? `Note: ${metaError}. Message saved in conversation.` : null,
        });

    } catch (error) {
        console.error('[WhatsApp Send Fatal Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
