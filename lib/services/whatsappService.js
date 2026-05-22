import { supabase } from '../supabase';

export const whatsappService = {
    /**
     * Fetch conversations & KPIs for WhatsApp Command Center UI
     */
    async getWhatsappData() {
        // 1. Fetch Conversations
        const { data: conversations, error } = await supabase
            .from('wa_conversations')
            .select('*, customers(name), wa_messages(*)');

        if (error) throw error;

        // 2. Map to UI structure
        const allChats = (conversations || []).map(c => ({
            id: c.id,
            name: c.customers?.name || 'Guest',
            phone: c.phone_number,
            lastMsg: c.last_message,
            time: this.formatTime(c.updated_at),
            order: c.order_id,
            status: c.status,
            msgs: (c.wa_messages || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(m => ({
                from: m.sender_type,
                text: m.message_text,
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                conf: m.ai_confidence
            }))
        }));

        const botChats = allChats.filter(c => c.status === 'ai_handling');
        const supportChats = allChats.filter(c => c.status === 'manual_support');

        // 3. KPIs
        const { count: escalatedCount } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');

        return {
            botChats,
            supportChats: supportChats.map(s => ({ ...s, unread: 1, reason: 'Escalated' })),
            kpis: {
                today: 127,
                aiRate: '94%',
                avgReply: '1.2s',
                escalated: escalatedCount || 0
            }
        };
    },

    /**
     * Send automatic order notification via WhatsApp Meta Cloud API
     * @param {string} userId - UUID of the tenant/user
     * @param {string} orderId - UUID of the placed order
     */
    async sendOrderNotification(userId, orderId, orderStatus = 'processing') {
        console.log(`[WhatsApp Service] Initiating notification flow for order ${orderId} (status: ${orderStatus}, user: ${userId})...`);
        
        try {
            // 1. Fetch active user WhatsApp configurations from users table
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_waba_id, wa_access_token, wa_template_name, wa_is_active')
                .eq('id', userId)
                .single();

            if (userError || !user) {
                console.error('[WhatsApp Service] Failed to retrieve tenant credentials:', userError);
                return { success: false, error: 'Tenant configuration not found' };
            }

            if (!user.wa_is_active) {
                console.log('[WhatsApp Service] WhatsApp notifications are disabled for this tenant. Skipping.');
                return { success: false, reason: 'WhatsApp deactivated by tenant' };
            }

            if (!user.wa_phone_number_id || !user.wa_access_token) {
                console.error('[WhatsApp Service] Missing Meta API credentials. Skipping.');
                return { success: false, error: 'Incomplete API credentials' };
            }

            // 2. Fetch order details from database
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('order_number, customer_name, customer_phone, total_amount, currency')
                .eq('id', orderId)
                .single();

            if (orderError || !order) {
                console.error(`[WhatsApp Service] Failed to retrieve order details for ID ${orderId}:`, orderError);
                return { success: false, error: 'Order not found' };
            }

            const phone = order.customer_phone || '';
            const recipientPhone = this.formatPhoneNumber(phone);

            if (!recipientPhone) {
                console.warn(`[WhatsApp Service] Invalid/missing customer phone number: "${phone}". Cannot send message.`);
                
                // Log failed attempt
                await supabase.from('notification_logs').insert({
                    user_id: userId,
                    order_id: orderId,
                    recipient_phone: phone || 'N/A',
                    status: 'failed',
                    error_message: 'Invalid or missing phone number'
                });
                return { success: false, error: 'Invalid phone number' };
            }

            let templateName = user.wa_template_name || 'order_confirmation';
            if (orderStatus === 'completed' || orderStatus === 'Completed') {
                templateName = 'order_completed';
            }
            
            const customerName = order.customer_name || 'Customer';
            const orderNum = order.order_number || orderId.substring(0, 8);
            const totalStr = `${order.currency || 'PKR'} ${Number(order.total_amount).toLocaleString()}`;

            // 3. Dispatch REST request to Meta Cloud API
            console.log(`[WhatsApp Service] Dispatching template "${templateName}" to ${recipientPhone}...`);
            const metaResponse = await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName,
                params: [customerName, orderNum, totalStr]
            });

            const messageId = metaResponse?.messages?.[0]?.id || null;

            // 4. Log successful attempt
            console.log(`[WhatsApp Service] Successfully sent message! Message SID: ${messageId}`);
            await supabase.from('notification_logs').insert({
                user_id: userId,
                order_id: orderId,
                recipient_phone: recipientPhone,
                message_sid: messageId,
                status: 'sent'
            });

            return { success: true, messageId };

        } catch (err) {
            console.error('[WhatsApp Service] Fatal error in sendOrderNotification:', err.message);

            // Log fatal error to audit trail
            try {
                await supabase.from('notification_logs').insert({
                    user_id: userId,
                    order_id: orderId,
                    recipient_phone: 'N/A',
                    status: 'failed',
                    error_message: err.message
                });
            } catch (dbErr) {
                console.error('[WhatsApp Service] Double fault: Failed to write audit log:', dbErr.message);
            }

            return { success: false, error: err.message };
        }
    },

    /**
     * Dispatch WhatsApp Business REST API call
     */
    async sendMetaWhatsAppTemplate({ phoneNumberId, accessToken, recipientPhone, templateName, params }) {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en' },
                components: [
                    {
                        type: 'body',
                        parameters: params.map(val => ({
                            type: 'text',
                            text: String(val)
                        }))
                    }
                ]
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(`Meta API error: ${res.statusText} - ${JSON.stringify(errBody)}`);
        }

        return res.json();
    },

    /**
     * E.164 phone number formatting utility
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;
        let cleaned = phone.replace(/\D/g, ''); // strip non-numeric characters
        
        if (cleaned.startsWith('0')) {
            if (cleaned.startsWith('07') && cleaned.length === 11) {
                // UK Mobile Prefix (07...)
                cleaned = '44' + cleaned.substring(1);
            } else if (cleaned.startsWith('03') && cleaned.length === 11) {
                // Pakistan Mobile Prefix (03...)
                cleaned = '92' + cleaned.substring(1);
            } else {
                // Default fallback
                cleaned = '92' + cleaned.substring(1);
            }
        }
        
        if (cleaned.length < 10 || cleaned.length > 15) {
            return null; // invalid length
        }
        return cleaned;
    },

    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return `${Math.floor(diffMins / 1440)}d`;
    }
};
