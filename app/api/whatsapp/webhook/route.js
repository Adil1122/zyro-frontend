import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPostExOrder, isPostExConfigured } from '@/lib/services/postexService';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages (interactive button replies or text).
 * Handles YES/NO responses to order_created template.
 * 
 * Meta sends webhooks in this format:
 * {
 *   object: "whatsapp_business_account",
 *   entry: [{ changes: [{ value: { messages: [...] } }] }]
 * }
 */
export async function POST(request) {
    try {
        const payload = await request.json();
        console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload).substring(0, 500));

        // Meta webhook verification (GET requests)
        // This POST handler handles actual message events

        if (payload?.entry?.[0]?.changes?.[0]?.value?.statuses) {
            const statuses = payload.entry[0].changes[0].value.statuses;
            console.log('[WhatsApp Webhook] Message Status Update:', JSON.stringify(statuses, null, 2));
            return NextResponse.json({ status: 'ok' });
        }

        if (!payload?.entry?.[0]?.changes?.[0]?.value?.messages) {
            // Could be another non-message event
            console.log('[WhatsApp Webhook] Non-message event, acknowledging.');
            return NextResponse.json({ status: 'ok' });
        }

        const messages = payload.entry[0].changes[0].value.messages;
        const metadata = payload.entry[0].changes[0].value.metadata;
        const phoneNumberId = metadata?.phone_number_id;

        for (const message of messages) {
            const senderPhone = message.from; // E.164 format without +
            let responseText = '';

            // Extract user response from different message types
            if (message.type === 'interactive') {
                // Button reply from template
                const buttonReply = message.interactive?.button_reply;
                const title = buttonReply?.title?.trim()?.toUpperCase() || '';
                const payloadId = buttonReply?.id?.trim()?.toUpperCase() || '';
                
                // Robust matching: check if title or payload contains YES/NO
                if (title === 'YES' || payloadId === 'YES' || title.includes('YES')) {
                    responseText = 'YES';
                } else if (title === 'NO' || payloadId === 'NO' || title.includes('NO')) {
                    responseText = 'NO';
                } else {
                    responseText = title || payloadId;
                }
                
                console.log(`[WhatsApp Webhook] Interactive button reply from ${senderPhone}: title="${buttonReply?.title}", payload="${buttonReply?.id}" -> interpreted as "${responseText}"`);
            } else if (message.type === 'text') {
                // Plain text reply
                responseText = message.text?.body?.trim()?.toUpperCase() || '';
                console.log(`[WhatsApp Webhook] Text reply from ${senderPhone}: "${responseText}"`);
            } else {
                console.log(`[WhatsApp Webhook] Ignoring message type: ${message.type}`);
                continue;
            }

            // Handle YES / NO
            if (responseText === 'YES' || responseText === 'NO') {
                await handleOrderConfirmation(senderPhone, responseText, phoneNumberId);
            }
        }

        return NextResponse.json({ status: 'processed' });

    } catch (error) {
        console.error('[WhatsApp Webhook Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification challenge
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // You should set a VERIFY_TOKEN in your env
    const verifyToken = process.env.WA_VERIFY_TOKEN || 'zyro_verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WhatsApp Webhook] Verification successful');
        return new Response(challenge, { status: 200 });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}


/**
 * Handle YES/NO order confirmation
 */
async function handleOrderConfirmation(senderPhone, response, phoneNumberId) {
    console.log(`[WhatsApp Webhook] Processing ${response} from ${senderPhone}...`);

    // 1. Find pending order for this phone number
    // Strip leading country code variants to match stored phone
    const phoneVariants = generatePhoneVariants(senderPhone);
    
    let pendingOrder = null;
    for (const phone of phoneVariants) {
        const { data } = await supabase
            .from('wa_pending_orders')
            .select('*')
            .eq('phone', phone)
            .eq('status', 'pending_confirmation')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (data) {
            pendingOrder = data;
            break;
        }
    }

    if (!pendingOrder) {
        console.warn(`[WhatsApp Webhook] No pending order found for phone: ${senderPhone}`);
        return;
    }

    const userId = pendingOrder.user_id;

    if (response === 'NO') {
        // Mark as rejected
        await supabase
            .from('wa_pending_orders')
            .update({ status: 'rejected' })
            .eq('id', pendingOrder.id);

        console.log(`[WhatsApp Webhook] Order ${pendingOrder.order_ref} rejected by customer.`);

        // Send rejection acknowledgement via WhatsApp
        await sendWhatsAppTextMessage(userId, senderPhone, 
            `Your order ${pendingOrder.order_ref} has been cancelled as per your request. Thank you!`
        );
        return;
    }

    // response === 'YES'
    try {
        // 2. Get user's PostEx API key
        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key, currency, wa_phone_number_id, wa_access_token')
            .eq('id', userId)
            .single();

        if (!user?.postex_api_key) {
            console.error('[WhatsApp Webhook] PostEx API key not configured for user:', userId);
            await supabase.from('wa_pending_orders').update({ status: 'confirmed' }).eq('id', pendingOrder.id);
            return;
        }

        // 3. Create PostEx order
        const postexResult = await createPostExOrder(user.postex_api_key, {
            orderRefNumber: pendingOrder.order_ref,
            customerName: pendingOrder.customer_name,
            customerPhone: pendingOrder.phone,
            deliveryAddress: pendingOrder.delivery_address || 'N/A',
            cityName: pendingOrder.city_name || 'Karachi',
            invoicePayment: pendingOrder.total_amount,
            orderDetail: pendingOrder.order_detail || '',
        });

        const trackingNumber = postexResult?.trackingNumber || null;
        console.log(`[WhatsApp Webhook] PostEx order created. Tracking: ${trackingNumber}`);

        // 4. Save customer to DB (same as WooCommerce sync)
        let customerId = null;
        const customerData = {
            user_id: userId,
            name: pendingOrder.customer_name || 'WhatsApp Customer',
            email: '',
            contact: pendingOrder.phone,
            city: pendingOrder.city_name || '',
            total_orders: 1,
            total_spent: parseFloat(pendingOrder.total_amount) || 0,
            status: 'active',
            last_order_date: new Date().toISOString(),
        };

        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .eq('contact', pendingOrder.phone)
            .maybeSingle();

        if (existingCustomer?.id) {
            customerId = existingCustomer.id;
            await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
        } else {
            const { data: newCustomer, error: custErr } = await supabase
                .from('customers')
                .insert(customerData)
                .select('id')
                .single();
            if (!custErr) customerId = newCustomer?.id;
        }

        // 5. Save order to DB (same as WooCommerce sync)
        const orderData = {
            user_id: userId,
            customer_id: customerId,
            order_id: pendingOrder.order_ref,
            platform_id: 2, // PostEx
            status: 'pending',
            total_amount: parseFloat(pendingOrder.total_amount) || 0,
        };

        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .eq('order_id', pendingOrder.order_ref)
            .maybeSingle();

        let dbOrderId = null;
        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;
            await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
        } else {
            const { data: newOrder, error: orderErr } = await supabase
                .from('orders')
                .insert(orderData)
                .select('id')
                .single();
            if (!orderErr) dbOrderId = newOrder?.id;
        }

        // 6. Insert order item
        if (dbOrderId) {
            await supabase.from('order_items').insert({
                order_id: dbOrderId,
                product_id: null,
                quantity: 1,
                price: parseFloat(pendingOrder.total_amount) || 0,
            });
        }

        // 7. Update pending order status
        await supabase
            .from('wa_pending_orders')
            .update({
                status: 'confirmed',
                postex_tracking_number: trackingNumber,
            })
            .eq('id', pendingOrder.id);

        // 8. Send confirmation message with tracking number
        const confirmMsg = trackingNumber
            ? `✅ Your order ${pendingOrder.order_ref} has been confirmed and booked with PostEx!\n\n📦 Tracking Number: ${trackingNumber}\n💰 Total: Rs ${pendingOrder.total_amount}\n\nThank you for your order!`
            : `✅ Your order ${pendingOrder.order_ref} has been confirmed!\n\n💰 Total: Rs ${pendingOrder.total_amount}\n\nThank you for your order!`;

        await sendWhatsAppTextMessage(userId, senderPhone, confirmMsg);

        console.log(`[WhatsApp Webhook] Order ${pendingOrder.order_ref} fully processed. DB Order: ${dbOrderId}, Tracking: ${trackingNumber}`);

    } catch (err) {
        console.error('[WhatsApp Webhook] Error processing YES confirmation:', err);
        // Still mark as confirmed to avoid re-processing
        await supabase.from('wa_pending_orders').update({ status: 'confirmed' }).eq('id', pendingOrder.id);
    }
}


/**
 * Send a plain text WhatsApp message to a phone number
 */
async function sendWhatsAppTextMessage(userId, recipientPhone, text) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('wa_phone_number_id, wa_access_token')
            .eq('id', userId)
            .single();

        if (!user?.wa_phone_number_id || !user?.wa_access_token) {
            console.warn('[WhatsApp Webhook] Cannot send reply - missing WA credentials');
            return;
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
                to: recipientPhone,
                type: 'text',
                text: { body: text },
            }),
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error('[WhatsApp Webhook] Failed to send reply:', errBody);
        }
    } catch (err) {
        console.error('[WhatsApp Webhook] Error sending text message:', err);
    }
}


/**
 * Generate phone number variants for matching
 * E.g. "923001234567" → ["923001234567", "03001234567", "3001234567"]
 */
function generatePhoneVariants(phone) {
    const variants = [phone];
    
    // If starts with 92, also try with 0 prefix and without country code
    if (phone.startsWith('92')) {
        variants.push('0' + phone.substring(2)); // 03001234567
        variants.push(phone.substring(2));         // 3001234567
    }
    // If starts with 0, also try with 92 prefix
    if (phone.startsWith('0')) {
        variants.push('92' + phone.substring(1));  // 923001234567
        variants.push(phone.substring(1));         // 3001234567
    }
    // If doesn't start with 0 or 92, try adding both
    if (!phone.startsWith('0') && !phone.startsWith('92')) {
        variants.push('0' + phone);    // 03001234567
        variants.push('92' + phone);   // 923001234567
    }
    
    return [...new Set(variants)]; // deduplicate
}
