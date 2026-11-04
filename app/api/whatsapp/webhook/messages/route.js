
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Meta webhook verification
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const mode = searchParams.get("hub.mode");
        const token = searchParams.get("hub.verify_token");
        const challenge = searchParams.get("hub.challenge");

        const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

        if (!verifyToken) {
            console.error("META_WEBHOOK_VERIFY_TOKEN is missing");

            return new Response("Server configuration error", {
                status: 500,
            });
        }

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

        console.warn("WhatsApp webhook verification failed");

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
        const appSecret = process.env.META_APP_SECRET;

        if (!appSecret) {
            console.error("META_APP_SECRET is missing");

            return new Response("Server configuration error", {
                status: 500,
            });
        }

        // Read the original request body
        const rawBody = await request.text();

        // Get Meta signature
        const signature = request.headers.get("x-hub-signature-256");

        if (!signature) {
            return new Response("Missing signature", {
                status: 401,
            });
        }

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

        // Parse JSON after validating signature
        const payload = JSON.parse(rawBody);

        if (payload.object !== "whatsapp_business_account") {
            return new Response("Ignored", {
                status: 200,
            });
        }

        // Process WhatsApp events
        for (const entry of payload.entry || []) {
            const businessAccountId = entry.id;

            for (const change of entry.changes || []) {
                const field = change.field;
                const value = change.value || {};

                if (field === "messages") {
                    // Incoming messages
                    for (const message of value.messages || []) {
                        console.log("Incoming WhatsApp message:", {
                            businessAccountId,
                            phoneNumberId: value.metadata?.phone_number_id,
                            messageId: message.id,
                            sender: message.from,
                            type: message.type,
                            timestamp: message.timestamp,
                            content: message,
                        });

                        // TODO: Save message in Supabase
                        // TODO: Identify the ZYRO merchant using phoneNumberId
                    }

                    // Message delivery/read statuses
                    for (const status of value.statuses || []) {
                        console.log("WhatsApp message status:", {
                            businessAccountId,
                            phoneNumberId: value.metadata?.phone_number_id,
                            messageId: status.id,
                            recipient: status.recipient_id,
                            status: status.status,
                            timestamp: status.timestamp,
                        });

                        // TODO: Update message status in Supabase
                    }
                } else {
                    console.log("Other WhatsApp event:", {
                        businessAccountId,
                        field,
                        value,
                    });
                }
            }
        }

        // Acknowledge successful receipt
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
