import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const ZYRO_KNOWLEDGE_PROMPT = `
You are the Zyro AI Bot, the official intelligent assistant for the Zyro Platform.
Zyro is Pakistan's premier e-commerce operations SaaS built specifically for Pakistani merchants and D2C brands.

Core capabilities and knowledge of Zyro:
1. CONNECTED STORES (/settings/stores):
   - WooCommerce: Connect via Store URL, Consumer Key (ck_...), and Consumer Secret (cs_...). Webhooks for order-created, order-updated, product-sync, and customer-created. Auto-polling fallback available.
   - Shopify: Connect via Custom App access token (shpat_...) or Shopify OAuth app. Automatically syncs products, inventory, and orders.
   - Daraz: Connect via Daraz Open Platform credentials (App Key, App Secret, Seller ID). Fetches orders and syncs product inventory.
   - Multi-store support: Merchants can connect multiple stores simultaneously based on their plan.

2. COURIERS & SHIPPING (/couriers & /settings/couriers):
   - PostEx: Direct API token integration. Features 1-click WhatsApp order confirmation flow:
     When an order is placed, a WhatsApp message is sent to the customer asking for confirmation.
     If the customer replies "YES", Zyro instantly books the shipment with PostEx, generates an official PDF shipping slip with a barcode, records tracking, and updates the order status.
     If the customer replies "NO", Zyro marks the order as cancelled and attempts cancellation with PostEx if already booked.
   - TCS: Username, password, cost center code, origin city. Supports express tracking and auto-booking.
   - Leopards: API key, API password, client code, origin city. Real-time booking and COD tracking.
   - Trax, Pakistan Post, DHL, InstaWorld, MP Courier.
   - COD Recovery: Real-time calculation of pending Cash on Delivery (COD) amounts vs recovered amounts across all couriers.

3. WHATSAPP COMMAND CENTER & AUTOMATIONS (/whatsapp & /settings/whatsapp):
   - Dual-number operations: AI Bot handles store and platform assistance; Support Team handles real two-way WhatsApp communication between the merchant and Zyro Support or customers.
   - WhatsApp Meta Cloud API settings:
     - Phone Number ID: Unique ID of the WhatsApp Business phone number in Meta Business Manager.
     - WhatsApp Business Account (WABA) ID: The ID of your Meta WABA account.
     - Permanent System User Access Token: Long-lived token generated in Meta Business Manager with 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.
     - Merchant WhatsApp Number: Personal WhatsApp phone number formatted as 923XXXXXXXXX (no + or spaces) for receiving automated order alerts and low stock alerts.
     - Approved Templates: order_created (with YES/NO buttons for PostEx confirmation), payment_received, order_canceled, order_shipped, order_status_update, new_order_merchant, low_stock_alert.
   - Escalation rules: Automatically flags keywords such as 'complaint', 'problem', 'refund', 'farzi', 'dhoka', 'kharab', 'wapas karo' and routes to Support Team.

4. INVENTORY & POS (/inventory):
   - Real-time stock levels across connected sales channels.
   - Purchase Orders (PO) workflow, supplier directories, inventory movements log, returns management, low-stock notifications.

5. MARKETING & ANALYTICS (/marketing & /analytics):
   - Meta Ads & Google Ads API connection for live ROAS and campaign performance.
   - Automated Daily PnL: Calculates Total Revenue - Product COGS - Courier Shipping Fees - Ad Spend = Net Profit, sent daily at midnight.

Instructions:
- Provide clear, actionable, friendly, and concise responses.
- Use formatting (bullet points, bold text, step-by-step numbers) to make your answer easy to read.
- When explaining technical steps, specify exact URLs and settings in Zyro.
- Answer in English or Roman Urdu if the user asks in Roman Urdu.
`;

// Built-in knowledge fallback if Gemini API key is missing or fails
function getBuiltinFallbackResponse(query) {
    const q = (query || '').toLowerCase();

    if (q.includes('woocomerce') || q.includes('woocommerce') || q.includes('wp')) {
        return `### 🛍️ How to Connect WooCommerce with Zyro
1. Go to **Settings** → **Connected Stores** (\`/settings/stores\`).
2. Click **Manage** on the **WooCommerce** card.
3. Enter your:
   - **Store URL**: e.g., \`https://yourstore.com\`
   - **Consumer Key**: Generated in WooCommerce → Settings → Advanced → REST API (starts with \`ck_...\`)
   - **Consumer Secret**: Generated alongside the key (starts with \`cs_...\`)
4. Ensure permissions are set to **Read/Write**.
5. Click **Save & Test Connection**.
6. Once connected, click **Sync** to import orders, customers, and inventory!`;
    }

    if (q.includes('shopify')) {
        return `### 🛍️ How to Connect Shopify with Zyro
1. Go to **Settings** → **Connected Stores** (\`/settings/stores\`).
2. Select the **Shopify** card.
3. Enter your **Shopify Store Domain** (e.g., \`your-brand.myshopify.com\`).
4. Generate an **Admin API Access Token** in Shopify Partner or Custom Apps:
   - Required Scopes: \`read_orders\`, \`write_orders\`, \`read_products\`, \`write_products\`, \`read_inventory\`.
5. Paste your access token (starts with \`shpat_...\`) and click **Connect**.
6. Zyro will automatically register order and inventory webhooks for instant sync!`;
    }

    if (q.includes('postex') || q.includes('yes') || q.includes('confirmation') || q.includes('courier')) {
        return `### 🚚 PostEx & WhatsApp Auto-Confirmation Flow
Zyro features Pakistan's leading 1-click courier confirmation system:
1. **Setup**: Add your PostEx API Token in **Settings** → **Couriers** → **PostEx**.
2. **Order Placement**: When a customer places a COD order, Zyro automatically dispatches a WhatsApp message with **YES** and **NO** buttons.
3. **If Customer replies "YES"**:
   - Zyro automatically books the parcel with PostEx.
   - Generates an official shipping label PDF with barcode.
   - Updates order status to **Processing** and sends the PostEx tracking number to the customer.
4. **If Customer replies "NO"**:
   - Zyro marks the order as cancelled and frees up stock.`;
    }

    if (q.includes('whatsapp') || q.includes('meta') || q.includes('token') || q.includes('waba') || q.includes('settings')) {
        return `### 📱 Configuring WhatsApp in Zyro (/settings/whatsapp)
To enable official WhatsApp Cloud API:
1. **Phone Number ID**: Obtain from Meta Developers Portal → WhatsApp → API Setup.
2. **WABA ID**: WhatsApp Business Account ID under your Meta Business Manager.
3. **Permanent Access Token**: Create a System User in Meta Business Settings with Admin role, generate token with \`whatsapp_business_messaging\` and \`whatsapp_business_management\`.
4. **Merchant WhatsApp Number**: Your personal number (format: \`923001234567\`) to receive real-time order notifications and low stock alerts.
5. **Approved Templates**: Match names in Meta with Zyro (e.g. \`order_created\`, \`order_shipped\`, \`payment_received\`).`;
    }

    if (q.includes('pnl') || q.includes('profit') || q.includes('analytics') || q.includes('revenue')) {
        return `### 📊 Daily PnL & Financial Analytics
Zyro automatically calculates your true bottom line in **Analytics** (\`/analytics\`):
- **Net Profit Formula**: \`Total Revenue - Product COGS - Courier Fees - Ad Spend (Meta & Google)\`.
- **Automated Midnight Calculation**: A cron job computes daily PnL at 12:00 AM PKT and can send an executive summary directly to your merchant WhatsApp.
- **COD Reconciliation**: Tracks pending vs recovered payments across PostEx, TCS, and Leopards.`;
    }

    if (q.includes('inventory') || q.includes('stock') || q.includes('supplier') || q.includes('po')) {
        return `### 📦 Inventory & Purchase Orders Management
- **Stock Sync**: Keep inventory unified across Shopify, WooCommerce, and manual sales in \`/inventory\`.
- **Purchase Orders (POs)**: Create POs with suppliers, track inbound stock, and record payments.
- **Low Stock Alerts**: Zyro notifies you via WhatsApp when items drop below threshold.
- **Returns Tracking**: Log returned shipments, inspect item condition, and restock automatically.`;
    }

    return `Hello! I am your Zyro AI Copilot. 

I can help you with:
- 🛒 **Connecting Sales Channels**: WooCommerce, Shopify, Daraz.
- 🚚 **Couriers & COD**: PostEx 1-click WhatsApp confirmation, TCS, Leopards, Trax.
- 📱 **WhatsApp Setup**: Meta Cloud API, Phone Number ID, WABA, and templates.
- 📊 **Daily PnL**: Real-time revenue, COGS, marketing ROAS, and net profits.
- 📦 **Inventory & POS**: Multi-channel stock sync and Purchase Orders.

What would you like assistance with today?`;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { message, history } = body;

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // If Gemini API Key is available, use official @google/genai SDK
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });

                // Construct conversation contents
                const formattedContents = [];

                if (Array.isArray(history)) {
                    for (const turn of history.slice(-8)) {
                        if (turn.text && turn.from) {
                            formattedContents.push({
                                role: turn.from === 'user' ? 'user' : 'model',
                                parts: [{ text: turn.text }]
                            });
                        }
                    }
                }

                formattedContents.push({
                    role: 'user',
                    parts: [{ text: message.trim() }]
                });

                const response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: formattedContents,
                    config: {
                        systemInstruction: ZYRO_KNOWLEDGE_PROMPT,
                        temperature: 0.6,
                    }
                });

                const replyText = response.text || '';
                if (replyText) {
                    return NextResponse.json({
                        reply: replyText,
                        source: 'gemini-3.5-flash'
                    });
                }
            } catch (geminiError) {
                console.warn('[Zyro AI Bot] Gemini API error, falling back to Zyro Knowledge Engine:', geminiError.message);
            }
        }

        // Knowledge Base Fallback if API key is missing or encounters rate limit
        const fallbackReply = getBuiltinFallbackResponse(message);
        return NextResponse.json({
            reply: fallbackReply,
            source: 'zyro-knowledge-engine'
        });

    } catch (error) {
        console.error('[Zyro AI Bot Route Error]:', error);
        return NextResponse.json({
            reply: getBuiltinFallbackResponse(''),
            source: 'zyro-knowledge-engine'
        });
    }
}
