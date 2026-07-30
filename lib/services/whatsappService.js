import { supabase } from '../supabase.js';

export const whatsappService = {
    /**
     * Fetch conversations & KPIs for WhatsApp Command Center UI
     */
    async getWhatsappData() {
        // 1. Fetch Conversations with raw message timestamps
        const { data: conversations, error } = await supabase
            .from('wa_conversations')
            .select('*, customers(name), wa_messages(*)');

        if (error) throw error;

        // 2. Compute KPIs from raw data before formatting
        const todayStr = new Date().toDateString();
        let todayMsgCount = 0;
        let totalReplyMs = 0;
        let replyCount = 0;

        for (const c of (conversations || [])) {
            const sorted = (c.wa_messages || []).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            for (let i = 0; i < sorted.length; i++) {
                const m = sorted[i];
                if (new Date(m.created_at).toDateString() === todayStr) todayMsgCount++;

                // Average bot reply time: time between customer msg and next bot/ai msg
                if (m.sender_type === 'customer' && i + 1 < sorted.length) {
                    const next = sorted[i + 1];
                    if (next.sender_type === 'ai' || next.sender_type === 'bot') {
                        const diff = new Date(next.created_at).getTime() - new Date(m.created_at).getTime();
                        if (diff > 0 && diff < 5 * 60 * 1000) {
                            totalReplyMs += diff;
                            replyCount++;
                        }
                    }
                }
            }
        }

        // 3. Map to UI structure
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

        // 4. KPIs
        const { count: escalatedCount } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');

        const totalConvs = allChats.length;
        const aiRatePct = totalConvs > 0 ? Math.round((botChats.length / totalConvs) * 100) : null;

        const avgReplyMs = replyCount > 0 ? totalReplyMs / replyCount : 0;
        const avgReplyStr = avgReplyMs > 0
            ? avgReplyMs < 60000
                ? `${(avgReplyMs / 1000).toFixed(1)}s`
                : `${Math.round(avgReplyMs / 60000)}m`
            : '—';

        return {
            botChats,
            supportChats: supportChats.map(s => ({ ...s, unread: 1, reason: 'Escalated' })),
            kpis: {
                today: todayMsgCount,
                aiRate: aiRatePct !== null ? `${aiRatePct}%` : '—',
                avgReply: avgReplyStr,
                escalated: escalatedCount || 0
            }
        };
    },

    /**
     * Send order_created WhatsApp notification directly from WooCommerce webhook data.
     * Uses phone/name/total passed in — no DB lookup for customer contact needed.
     * Also creates wa_pending_orders record for YES/NO PostEx flow.
     */
    async sendOrderCreated(userId, { customerPhone, customerName, orderNumber, total, deliveryAddress, cityName, orderDetail }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_template_name, currency')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token) {
                console.log('[WhatsApp] sendOrderCreated: WA not configured or inactive');
                return { success: false, reason: 'WA not configured' };
            }

            const recipientPhone = this.formatPhoneNumber(customerPhone);
            if (!recipientPhone) {
                console.warn(`[WhatsApp] sendOrderCreated: invalid phone "${customerPhone}"`);
                return { success: false, error: 'Invalid phone number' };
            }

            const templateName = 'order_created';
            const currency = user.currency || 'PKR';
            const totalStr = `${currency} ${Number(total).toLocaleString()}`;

            console.log(`[WhatsApp] Sending "${templateName}" to ${recipientPhone} for order #${orderNumber}`);
            const result = await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName,
                params: [customerName, orderNumber, totalStr],
            });

            // Create wa_pending_orders entry so YES → PostEx auto-book works
            const { error: pendingErr } = await supabase.from('wa_pending_orders').insert({
                user_id: userId,
                phone: recipientPhone,
                customer_name: customerName,
                order_ref: orderNumber,
                total_amount: parseFloat(total) || 0,
                delivery_address: deliveryAddress || 'N/A',
                city_name: cityName || 'Karachi',
                order_detail: orderDetail || `WooCommerce Order ${orderNumber}`,
                status: 'pending_confirmation',
            });

            if (pendingErr) console.error('[WhatsApp] sendOrderCreated: wa_pending_orders insert error:', pendingErr.message);

            return result;
        } catch (err) {
            console.error('[WhatsApp] sendOrderCreated error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send automatic order notification via WhatsApp Meta Cloud API
     * @param {string} userId - UUID of the tenant/user
     * @param {string} orderId - UUID of the placed order
     */
    async sendOrderNotification(userId, orderId, orderStatus = 'processing') {
        console.log(`[WhatsApp Service] Initiating notification flow for order ${orderId} (status: ${orderStatus}, user: ${userId})...`);
        
        try {
            // 1. Fetch active user WhatsApp configurations and currency from users table
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_waba_id, wa_access_token, wa_template_name, wa_is_active, currency')
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

            // 2. Fetch order details from database using correct columns and customers relation join
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('order_id, total_amount, customers(name, contact)')
                .eq('id', orderId)
                .single();

            if (orderError || !order) {
                console.error(`[WhatsApp Service] Failed to retrieve order details for ID ${orderId}:`, orderError);
                return { success: false, error: 'Order not found' };
            }

            const phone = order.customers?.contact || '';
            const recipientPhone = this.formatPhoneNumber(phone);

            if (!recipientPhone) {
                console.warn(`[WhatsApp Service] Invalid/missing customer phone number: "${phone}". Cannot send message.`);
                
                // Log failed attempt
                await supabase.from('notification_logs').insert({
                    user_id: userId,
                    order_id: String(orderId),
                    recipient_phone: phone || 'N/A',
                    status: 'failed',
                    error_message: 'Invalid or missing phone number'
                });
                return { success: false, error: 'Invalid phone number' };
            }

            let templateName = user.wa_template_name || 'order_confirmation';
            if (orderStatus === 'completed' || orderStatus === 'Completed') {
                templateName = 'order_completed';
            } else if (orderStatus === 'pending' || orderStatus === 'Pending' || orderStatus === 'processing' || orderStatus === 'Processing') {
                templateName = 'order_created';
            }
            
            const customerName = order.customers?.name || 'Customer';
            const orderNum = order.order_id || String(orderId);
            const totalStr = `${user.currency || 'PKR'} ${Number(order.total_amount).toLocaleString()}`;

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

            // 3.5 Save to wa_pending_orders if it's a new order
            if (templateName === 'order_created' || templateName === 'order_confirmation') {
                const { error: pendingErr } = await supabase.from('wa_pending_orders').insert({
                    user_id: userId,
                    phone: recipientPhone,
                    customer_name: customerName,
                    order_ref: orderNum,
                    total_amount: parseFloat(order.total_amount) || 0,
                    delivery_address: 'N/A',
                    city_name: order.customers?.city || 'Karachi',
                    order_detail: `WooCommerce Order ${orderNum}`,
                    status: 'pending_confirmation'
                });
                
                if (pendingErr) {
                    console.error('[WhatsApp Service] Failed to save to wa_pending_orders:', pendingErr);
                } else {
                    console.log(`[WhatsApp Service] Saved order ${orderNum} to wa_pending_orders for confirmation.`);
                }
            }

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
    async sendMetaWhatsAppTemplate({ phoneNumberId, accessToken, recipientPhone, templateName, params, languageCode = 'en', quickReplyButtons = null }) {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode }
            }
        };

        if (params && params.length > 0) {
            payload.template.components = [
                {
                    type: 'body',
                    parameters: params.map(val => ({
                        type: 'text',
                        text: String(val)
                    }))
                }
            ];

            if (quickReplyButtons && quickReplyButtons.length > 0) {
                quickReplyButtons.forEach((btn, index) => {
                    payload.template.components.push({
                        type: 'button',
                        sub_type: 'quick_reply',
                        index: String(index),
                        parameters: [{ type: 'payload', payload: btn.payload || String(index) }]
                    });
                });
            }
        }

        console.log(`[WhatsApp] Sending payload:`, JSON.stringify(payload));
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseBody = await res.json().catch(() => ({}));
        console.log(`[WhatsApp] Meta response (${res.status}):`, JSON.stringify(responseBody));

        if (!res.ok) {
            // Template not found — walk through all language codes
            if (responseBody?.error?.code === 132001) {
                const fallbacks = { 'en': 'en_US', 'en_US': 'en_GB', 'en_GB': null };
                const next = fallbacks[languageCode];
                if (next) {
                    console.log(`[WhatsApp Service] Template not found in '${languageCode}'. Retrying with '${next}'...`);
                    return this.sendMetaWhatsAppTemplate({
                        phoneNumberId, accessToken, recipientPhone, templateName,
                        params, languageCode: next, quickReplyButtons,
                    });
                }
            }

            // Parameter mismatch — retry with no params
            if (params && params.length > 0 && responseBody?.error?.code === 132000) {
                console.warn(`[WhatsApp Service] Parameter mismatch. Retrying with NO parameters...`);
                return this.sendMetaWhatsAppTemplate({
                    phoneNumberId, accessToken, recipientPhone, templateName,
                    params: [], languageCode, quickReplyButtons,
                });
            }

            throw new Error(`Meta API error: ${res.status} - ${JSON.stringify(responseBody)}`);
        }

        return responseBody;
    },

    /**
     * E.164 phone number formatting utility
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;
        let cleaned = phone.replace(/\D/g, ''); // strip non-numeric characters

        // Strip international dialling prefix 00XX → XX (e.g. 0044... → 44...)
        if (cleaned.startsWith('00')) {
            cleaned = cleaned.substring(2);
        }

        if (cleaned.startsWith('0')) {
            if (cleaned.startsWith('07') && cleaned.length === 11) {
                cleaned = '44' + cleaned.substring(1); // UK: 07XXXXXXXXX → 447XXXXXXXXX
            } else if (cleaned.startsWith('03') && cleaned.length === 11) {
                cleaned = '92' + cleaned.substring(1); // Pakistan: 03XXXXXXXXX → 923XXXXXXXXX
            } else {
                cleaned = '92' + cleaned.substring(1); // fallback: assume Pakistan
            }
        }

        if (cleaned.length < 10 || cleaned.length > 15) {
            return null;
        }
        return cleaned;
    },

    /**
     * Send order status update notification to customer
     */
    async sendOrderStatusUpdate(userId, orderNumber, newStatus, customerPhone, customerName, totalAmount) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, currency, wa_template_cancelled, wa_template_payment, wa_template_shipped, wa_template_status')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token) {
                return { success: false, reason: 'WA not configured' };
            }

            const recipientPhone = this.formatPhoneNumber(customerPhone);
            if (!recipientPhone) return { success: false, error: 'Invalid phone' };

            const status = newStatus?.toLowerCase();
            let templateName, params, quickReplyButtons;

            if (status === 'processing') {
                templateName = user.wa_template_payment || 'payment_received';
                params = [customerName, orderNumber, `${user.currency || 'PKR'} ${Number(totalAmount || 0).toLocaleString()}`];
            } else if (status === 'cancelled' || status === 'refunded') {
                templateName = user.wa_template_cancelled || 'order_canceled';
                params = [customerName, orderNumber, String(Number(totalAmount || 0).toLocaleString())];

                if (recipientPhone) {
                    const { error: insertErr } = await supabase.from('wa_pending_orders').insert({
                        user_id: userId,
                        phone: recipientPhone,
                        customer_name: customerName,
                        order_ref: orderNumber,
                        total_amount: parseFloat(totalAmount) || 0,
                        delivery_address: 'N/A',
                        city_name: 'N/A',
                        order_detail: `Cancelled Order ${orderNumber}`,
                        status: 'pending_cancellation',
                    });
                    if (insertErr) console.error('[WhatsApp] Failed to insert pending_cancellation:', insertErr.message);
                }
            } else if (status === 'completed' || status === 'shipped') {
                templateName = user.wa_template_shipped || 'order_shipped';
                params = [customerName, orderNumber];
            } else if (status === 'failed') {
                templateName = user.wa_template_status || 'order_status_update';
                params = [customerName, orderNumber, 'Payment Failed'];
            } else {
                templateName = user.wa_template_status || 'order_status_update';
                params = [customerName, orderNumber, newStatus];
            }

            console.log(`[WhatsApp] Sending "${templateName}" to customer ${recipientPhone} for order #${orderNumber}`);
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName,
                params,
                quickReplyButtons,
            });
        } catch (err) {
            console.error('[WhatsApp] sendOrderStatusUpdate error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send new order alert to merchant's personal WhatsApp
     */
    async sendMerchantOrderAlert(userId, orderNumber, customerName, total) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, currency, wa_template_merchant')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            console.log(`[WhatsApp] Sending new order alert to merchant for order #${orderNumber}`);
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_merchant || 'new_order_merchant',
                params: [orderNumber, customerName, `${user.currency || 'PKR'} ${Number(total || 0).toLocaleString()}`],
            });
        } catch (err) {
            console.error('[WhatsApp] sendMerchantOrderAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send low stock alert to merchant's personal WhatsApp
     */
    async sendLowStockAlert(userId, productName, currentStock) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_low_stock')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            console.log(`[WhatsApp] Sending low stock alert for "${productName}" (stock: ${currentStock})`);
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_low_stock || 'low_stock_alert',
                params: [productName, String(currentStock)],
            });
        } catch (err) {
            console.error('[WhatsApp] sendLowStockAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send COD settlement received confirmation to merchant
     */
    async sendCodSettlementAlert(userId, { date, receivedAmount, orderCount, currency }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_cod_settlement')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_cod_settlement || 'cod_settlement_received',
                params: [
                    date,
                    `${currency || 'PKR'} ${Number(receivedAmount).toLocaleString()}`,
                    String(orderCount),
                ],
            });
        } catch (err) {
            console.error('[WhatsApp] sendCodSettlementAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send COD mismatch alert to merchant
     */
    async sendCodMismatchAlert(userId, { expected, received, difference, currency }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_cod_mismatch')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            const cur = currency || 'PKR';
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_cod_mismatch || 'cod_mismatch_alert',
                params: [
                    `${cur} ${Number(expected).toLocaleString()}`,
                    `${cur} ${Number(received).toLocaleString()}`,
                    `${cur} ${Number(difference).toLocaleString()}`,
                ],
            });
        } catch (err) {
            console.error('[WhatsApp] sendCodMismatchAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send daily P&L report to merchant's WhatsApp
     */
    async sendDailyPnLReport(userId, { date, totalOrders, grossRevenue, cancelledOrders, cancelledAmount, netRevenue }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_pnl, currency')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            const currency = user.currency || 'PKR';
            const templateName = user.wa_template_pnl || 'daily_pnl_report';

            console.log(`[WhatsApp] Sending daily P&L report to merchant for ${date}`);
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName,
                params: [
                    date,
                    String(totalOrders),
                    `${currency} ${Number(grossRevenue).toLocaleString()}`,
                    String(cancelledOrders),
                    `${currency} ${Number(netRevenue).toLocaleString()}`,
                ],
            });
        } catch (err) {
            console.error('[WhatsApp] sendDailyPnLReport error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send shipment picked-up notification to customer
     */
    async sendShipmentPickedUp(userId, { customerPhone, customerName, orderRef, trackingNumber }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_template_shipment_picked')
                .eq('id', userId)
                .single();
            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token) return { success: false, reason: 'WA not configured' };
            const recipientPhone = this.formatPhoneNumber(customerPhone);
            if (!recipientPhone) return { success: false, error: 'Invalid phone' };
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_shipment_picked || 'shipment_picked_up',
                params: [orderRef, customerName, trackingNumber],
            });
        } catch (err) {
            console.error('[WhatsApp] sendShipmentPickedUp error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send shipment in-transit notification to customer
     */
    async sendShipmentInTransit(userId, { customerPhone, customerName, orderRef, trackingNumber }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_template_shipment_transit')
                .eq('id', userId)
                .single();
            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token) return { success: false, reason: 'WA not configured' };
            const recipientPhone = this.formatPhoneNumber(customerPhone);
            if (!recipientPhone) return { success: false, error: 'Invalid phone' };
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_shipment_transit || 'shipment_in_transit',
                params: [orderRef, customerName, trackingNumber],
            });
        } catch (err) {
            console.error('[WhatsApp] sendShipmentInTransit error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send delivery confirmation to customer
     */
    async sendShipmentDelivered(userId, { customerPhone, customerName, orderRef }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_template_shipment_delivered')
                .eq('id', userId)
                .single();
            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token) return { success: false, reason: 'WA not configured' };
            const recipientPhone = this.formatPhoneNumber(customerPhone);
            if (!recipientPhone) return { success: false, error: 'Invalid phone' };
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_shipment_delivered || 'shipment_delivered',
                params: [orderRef, customerName],
            });
        } catch (err) {
            console.error('[WhatsApp] sendShipmentDelivered error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send failed-delivery alert to merchant
     */
    async sendShipmentFailed(userId, { orderRef, trackingNumber, customerName }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_shipment_failed')
                .eq('id', userId)
                .single();
            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) return { success: false, reason: 'Merchant phone not set' };
            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_shipment_failed || 'shipment_failed',
                params: [orderRef, trackingNumber, customerName],
            });
        } catch (err) {
            console.error('[WhatsApp] sendShipmentFailed error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send return alert to merchant
     */
    async sendShipmentReturned(userId, { orderRef, trackingNumber, customerName }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_shipment_returned')
                .eq('id', userId)
                .single();
            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) return { success: false, reason: 'Merchant phone not set' };
            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_shipment_returned || 'shipment_returned',
                params: [orderRef, trackingNumber, customerName],
            });
        } catch (err) {
            console.error('[WhatsApp] sendShipmentReturned error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send Purchase Order created alert to merchant
     * Fires on supplier.po_created event
     */
    async sendPOCreatedAlert(userId, { poNumber, supplierName, totalAmount, itemCount }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_po_created, currency')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            const currency = user.currency || 'PKR';
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_po_created || 'supplier_po_created',
                params: [
                    poNumber,
                    supplierName,
                    `${currency} ${totalAmount}`,
                    String(itemCount),
                ],
            });
        } catch (err) {
            console.error('[WhatsApp] sendPOCreatedAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send Purchase Order received alert to merchant
     * Fires on supplier.po_received event
     */
    async sendPOReceivedAlert(userId, { poNumber, supplierName, totalAmount, receivedDate }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_po_received, currency')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            const currency = user.currency || 'PKR';
            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_po_received || 'supplier_po_received',
                params: [
                    poNumber,
                    supplierName,
                    `${currency} ${totalAmount}`,
                    receivedDate,
                ],
            });
        } catch (err) {
            console.error('[WhatsApp] sendPOReceivedAlert error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send complaint detected alert to merchant
     * Fires on whatsapp.complaint_detected event
     */
    async sendComplaintAlert(userId, { customerIdentifier, messageSnippet }) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_complaint')
                .eq('id', userId)
                .single();

            if (!user?.wa_is_active || !user?.wa_phone_number_id || !user?.wa_access_token || !user?.wa_merchant_phone) {
                return { success: false, reason: 'Merchant phone not set or WA not active' };
            }

            const recipientPhone = this.formatPhoneNumber(user.wa_merchant_phone);
            if (!recipientPhone) return { success: false, error: 'Invalid merchant phone' };

            // Truncate snippet to 100 chars to stay within Meta param limits
            const snippet = String(messageSnippet || '').substring(0, 100);

            return await this.sendMetaWhatsAppTemplate({
                phoneNumberId: user.wa_phone_number_id,
                accessToken: user.wa_access_token,
                recipientPhone,
                templateName: user.wa_template_complaint || 'complaint_detected',
                params: [customerIdentifier, snippet],
            });
        } catch (err) {
            console.error('[WhatsApp] sendComplaintAlert error:', err.message);
            return { success: false, error: err.message };
        }
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
