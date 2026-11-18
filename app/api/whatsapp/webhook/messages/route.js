import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_VERIFY_TOKEN = "d625c3f5baa2a2c604b0c7d88554cefd6b5d99ddadedc798d142dbdf6a0efc0e";
const DEFAULT_APP_SECRET = "a097d0e8ca09113d778e727f5b3f75f8";

// GET: Meta webhook verification
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const mode = searchParams.get("hub.mode");
        const token = searchParams.get("hub.verify_token");
        const challenge = searchParams.get("hub.challenge");

        const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

        if (
            mode === "subscribe" &&
            token === verifyToken &&
            challenge
        ) {
            console.log("WhatsApp webhook verified successfully");

            return new Response(challenge, {
                status: 200,
                headers: {
                    "Content-Type": "text/plain",
                },
            });
        }

        console.warn("WhatsApp webhook verification failed. Received token:", token);

        return new Response("Forbidden", {
            status: 403,
        });
    } catch (error) {
        console.error("Webhook GET error:", error);

        return new Response("Internal server error", {
            status: 500,
        });
    }
}

// POST: Receive WhatsApp webhook events
export async function POST(request) {
    try {
        const appSecret = process.env.META_APP_SECRET || DEFAULT_APP_SECRET;

        // Read the original request body
        const rawBody = await request.text();

        // Get Meta signature
        const signature = request.headers.get("x-hub-signature-256");

        if (signature) {
            // Generate expected signature
            const expectedSignature =
                "sha256=" +
                createHmac("sha256", appSecret)
                    .update(rawBody)
                    .digest("hex");

            const receivedBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);

            const validSignature =
                receivedBuffer.length === expectedBuffer.length &&
                timingSafeEqual(receivedBuffer, expectedBuffer);

            if (!validSignature) {
                console.warn("Invalid WhatsApp webhook signature");
                return new Response("Invalid signature", {
                    status: 401,
                });
            }
        }

        // Parse JSON after validating signature
        const payload = JSON.parse(rawBody);

        if (payload.object !== "whatsapp_business_account") {
            return new Response("Ignored", {
                status: 200,
            });
        }

        const db = supabaseAdmin || supabase;

        // Process WhatsApp events
        for (const entry of payload.entry || []) {
            const businessAccountId = entry.id;

            for (const change of entry.changes || []) {
                const field = change.field;
                const value = change.value || {};

                if (field === "messages") {
                    const phoneNumberId = value.metadata?.phone_number_id;

                    // 1. Resolve merchant user by phone_number_id
                    let resolvedUserId = null;
                    if (phoneNumberId) {
                        try {
                            const { data: conn } = await db
                                .from("whatsapp_connections")
                                .select("user_id")
                                .eq("phone_number_id", phoneNumberId)
                                .eq("connection_status", "connected")
                                .maybeSingle();

                            if (conn?.user_id) {
                                resolvedUserId = conn.user_id;
                            } else {
                                const { data: usr } = await db
                                    .from("users")
                                    .select("id")
                                    .eq("wa_phone_number_id", phoneNumberId)
                                    .maybeSingle();
                                if (usr?.id) resolvedUserId = usr.id;
                            }
                        } catch (resErr) {
                            console.warn("[Webhook] Merchant lookup error:", resErr.message);
                        }
                    }

                    // Fallback to primary tenant if not resolved
                    if (!resolvedUserId) {
                        const { data: defaultUser } = await db
                            .from("users")
                            .select("id")
                            .limit(1)
                            .maybeSingle();
                        resolvedUserId = defaultUser?.id || "e5940095-1560-4425-ab60-f8fc5f7874f4";
                    }

                    // 2. Process Incoming Messages
                    for (const message of value.messages || []) {
                        const messageId = message.id;
                        const senderPhone = message.from;
                        let textContent = "";

                        if (message.type === "text") {
                            textContent = message.text?.body || "";
                        } else if (message.type === "button") {
                            textContent = message.button?.text || message.button?.payload || "";
                        } else if (message.type === "interactive") {
                            textContent =
                                message.interactive?.button_reply?.title ||
                                message.interactive?.list_reply?.title ||
                                "Interactive message";
                        } else if (message.type === "image") {
                            textContent = message.image?.caption || "📷 Image attachment";
                        } else if (message.type === "document") {
                            textContent = message.document?.filename || "📄 Document attachment";
                        } else {
                            textContent = `[${message.type || "unknown"} message]`;
                        }

                        console.log("[Webhook] Processing incoming WhatsApp message:", {
                            businessAccountId,
                            phoneNumberId,
                            userId: resolvedUserId,
                            messageId,
                            senderPhone,
                            type: message.type,
                            textContent,
                        });

                        // 3. Log event idempotently in whatsapp_webhook_events
                        try {
                            await db.from("whatsapp_webhook_events").insert({
                                user_id: resolvedUserId,
                                phone_number_id: phoneNumberId || "unknown",
                                event_type: "message",
                                meta_event_id: messageId,
                                payload: message,
                            });
                        } catch (eventErr) {
                            // Duplicate event, skip processing
                            if (eventErr.code === "23505") {
                                console.log("[Webhook] Duplicate message event ignored:", messageId);
                                continue;
                            }
                        }

                        // 4. Upsert / find conversation
                        let conversationId = null;
                        try {
                            const { data: existingConv } = await db
                                .from("wa_conversations")
                                .select("id")
                                .eq("user_id", resolvedUserId)
                                .eq("phone_number", senderPhone)
                                .maybeSingle();

                            if (existingConv) {
                                conversationId = existingConv.id;
                                await db
                                    .from("wa_conversations")
                                    .update({
                                        last_message: textContent,
                                        updated_at: new Date().toISOString(),
                                    })
                                    .eq("id", conversationId);
                            } else {
                                const { data: newConv } = await db
                                    .from("wa_conversations")
                                    .insert({
                                        user_id: resolvedUserId,
                                        phone_number: senderPhone,
                                        last_message: textContent,
                                        status: "manual_support",
                                    })
                                    .select("id")
                                    .maybeSingle();

                                if (newConv) conversationId = newConv.id;
                            }

                            // 5. Insert into wa_messages
                            if (conversationId) {
                                await db.from("wa_messages").insert({
                                    conversation_id: conversationId,
                                    user_id: resolvedUserId,
                                    sender_type: "customer",
                                    message_text: textContent,
                                    created_at: new Date(Number(message.timestamp) * 1000).toISOString(),
                                });
                            }
                        } catch (dbErr) {
                            console.error("[Webhook] DB write message error:", dbErr.message);
                        }
                    }

                    // 6. Process message delivery/read statuses
                    for (const status of value.statuses || []) {
                        try {
                            await db.from("whatsapp_webhook_events").insert({
                                user_id: resolvedUserId,
                                phone_number_id: phoneNumberId || "unknown",
                                event_type: "status",
                                meta_event_id: `${status.id}_${status.status}`,
                                payload: status,
                            });
                        } catch {
                            // Non-fatal duplicate
                        }
                    }
                }
            }
        }

        // Acknowledge receipt
        return new Response("EVENT_RECEIVED", {
            status: 200,
        });
    } catch (error) {
        console.error("WhatsApp webhook POST error:", error);

        return new Response("Internal server error", {
            status: 500,
        });
    }
}

