# Shopify Integration — Step-by-Step Implementation Guide

## Overview

Shopify supports **both webhook push (real-time) AND manual pull sync**, making it the most powerful integration alongside WooCommerce. Authentication uses a simple **`X-Shopify-Access-Token` header** — much simpler than Daraz's HMAC-SHA256 signing.

Credentials are stored per-user in Supabase (not `.env.local`), following the same pattern as TCS, Leopards, and the refactored Daraz.

**Platform ID for Shopify orders in your DB: `6`**

---

## What Already Exists

| File | Status |
|------|--------|
| `lib/services/shopifyService.js` | Exists but reads creds from `process.env` — must be refactored |
| `components/dashboard/pages/ShopifyManagePage.jsx` | Exists but missing `x-user-id` header and config panel |
| `app/api/shopify/` | Empty directory — all route files need to be created |
| `SettingsPage.jsx` | Already has `useShopifyStats` hook, `ShopifyCard`, and manage route wired up correctly with `x-user-id` |

The SettingsPage is already well-wired. The main work is: **refactor the service + create API routes + fix the ManagePage**.

---

## Step 1 — Supabase Schema Migration

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shopify_store_domain TEXT,
  ADD COLUMN IF NOT EXISTS shopify_access_token  TEXT;
```

`shopify_store_domain` stores the store URL without protocol, e.g. `my-store.myshopify.com`.
`shopify_access_token` stores the Admin API access token, e.g. `shpat_xxxxxxxxxxxx`.

---

## Step 2 — Refactor `lib/services/shopifyService.js`

The service currently reads credentials from `process.env`. Refactor every function to accept a `creds` object `{ storeDomain, accessToken }` instead. The HMAC signing logic and `normalizeOrder` stay unchanged.

### 2a. Remove `getBaseUrl()` and replace with a helper that accepts creds

```js
const API_VERSION = '2024-01';

function buildBaseUrl(storeDomain) {
    const clean = storeDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${clean}/admin/api/${API_VERSION}`;
}
```

### 2b. Replace `getHeaders()` with a helper that accepts accessToken

```js
function buildHeaders(accessToken) {
    return {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
    };
}
```

### 2c. Refactor `shopifyGet()` to accept credentials

```js
async function shopifyGet(creds, endpoint, params = {}) {
    const { storeDomain, accessToken } = creds;
    const base = buildBaseUrl(storeDomain);
    const qs = new URLSearchParams(params).toString();
    const url = `${base}${endpoint}${qs ? '?' + qs : ''}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(accessToken),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error ${res.status}: ${body}`);
    }

    return res.json();
}
```

### 2d. Refactor `isShopifyConfigured()` to accept params

```js
export function isShopifyConfigured(storeDomain, accessToken) {
    return !!(
        storeDomain &&
        accessToken &&
        !storeDomain.includes('your-shopify') &&
        !storeDomain.includes('your_shopify') &&
        !accessToken.includes('shpat_xxxxxxxx')
    );
}
```

### 2e. Refactor `getShopifyStats()` to accept `creds`

```js
export async function getShopifyStats(creds) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const countData = await shopifyGet(creds, '/orders/count.json', { status: 'any' });
    const totalOrders = countData?.count ?? 0;

    const todayCountData = await shopifyGet(creds, '/orders/count.json', {
        status: 'any',
        created_at_min: todayStart.toISOString(),
    });
    const todayOrders = todayCountData?.count ?? 0;

    const [allOrdersData, todayOrdersData] = await Promise.all([
        shopifyGet(creds, '/orders.json', {
            status: 'any',
            fields: 'id,total_price,currency',
            limit: 250,
        }),
        shopifyGet(creds, '/orders.json', {
            status: 'any',
            created_at_min: todayStart.toISOString(),
            fields: 'id,total_price,currency',
            limit: 250,
        }),
    ]);

    const allOrders = allOrdersData?.orders || [];
    const todayOrdersList = todayOrdersData?.orders || [];
    const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const todayRevenue = todayOrdersList.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const currency = allOrders[0]?.currency || 'PKR';

    return { totalOrders, totalRevenue, todayOrders, todayRevenue, currency };
}
```

### 2f. Refactor `getShopifyOrders()` to accept `creds`

```js
export async function getShopifyOrders(creds, { page = 1, perPage = 10, search = '', status = 'all' } = {}) {
    const params = {
        limit: Math.min(perPage, 250),
        status: status === 'all' ? 'any' : status,
        order: 'created_at desc',
    };

    if (search) params.name = search;

    const countParams = { status: params.status };
    const countData = await shopifyGet(creds, '/orders/count.json', countParams);
    const totalOrders = countData?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

    const fetchLimit = Math.min(page * perPage, 250);
    const data = await shopifyGet(creds, '/orders.json', { ...params, limit: fetchLimit });

    let orders = (data?.orders || []).map(normalizeOrder);

    const startIdx = (page - 1) * perPage;
    orders = orders.slice(startIdx, startIdx + perPage);

    if (search) {
        const q = search.toLowerCase().replace('#', '');
        orders = orders.filter(o =>
            o.id.toString().includes(q) ||
            o.number.toString().includes(q) ||
            (o.customerName || '').toLowerCase().includes(q) ||
            (o.customerEmail || '').toLowerCase().includes(q)
        );
    }

    return {
        orders,
        pagination: { page, perPage, totalOrders, totalPages },
    };
}
```

The `normalizeOrder` and `mapShopifyStatus` functions at the bottom do not touch credentials — leave them unchanged.

---

## Step 3 — Create API Routes

### 3a. `app/api/shopify/orders/route.js`

```js
import { NextResponse } from 'next/server';
import { getShopifyOrders, isShopifyConfigured } from '@/lib/services/shopifyService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page    = parseInt(searchParams.get('page')    || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '10', 10);
    const status  = searchParams.get('status')  || 'all';
    const search  = searchParams.get('search')  || '';

    try {
        const { data: user } = await supabase
            .from('users')
            .select('shopify_store_domain, shopify_access_token')
            .eq('id', userId)
            .single();

        const { shopify_store_domain: storeDomain, shopify_access_token: accessToken } = user || {};

        if (!isShopifyConfigured(storeDomain, accessToken)) {
            return NextResponse.json({
                configured: false,
                orders: [],
                pagination: { page: 1, perPage, totalOrders: 0, totalPages: 1 },
            });
        }

        const creds = { storeDomain, accessToken };
        const result = await getShopifyOrders(creds, { page, perPage, search, status });

        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        console.error('[Shopify Orders Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

### 3b. `app/api/shopify/stats/route.js`

```js
import { NextResponse } from 'next/server';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('shopify_store_domain, shopify_access_token')
            .eq('id', userId)
            .single();

        const { shopify_store_domain: storeDomain, shopify_access_token: accessToken } = user || {};

        if (!isShopifyConfigured(storeDomain, accessToken)) {
            return NextResponse.json({ configured: false });
        }

        const creds = { storeDomain, accessToken };
        const stats = await getShopifyStats(creds);

        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Shopify Stats Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

### 3c. `app/api/shopify/sync/route.js`

Verifies the connection and upserts the Shopify courier row in Supabase.

```js
import { NextResponse } from 'next/server';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('shopify_store_domain, shopify_access_token')
            .eq('id', userId)
            .single();

        const { shopify_store_domain: storeDomain, shopify_access_token: accessToken } = user || {};

        if (!isShopifyConfigured(storeDomain, accessToken)) {
            return NextResponse.json({ error: 'Shopify credentials not configured' }, { status: 400 });
        }

        // Verify by calling stats — if it throws, credentials are wrong
        const creds = { storeDomain, accessToken };
        let stats;
        try {
            stats = await getShopifyStats(creds);
        } catch (e) {
            return NextResponse.json({ error: 'Shopify authentication failed: ' + e.message }, { status: 502 });
        }

        // Upsert the Shopify store row in the couriers/stores table
        const { data: existingStore } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'Shopify')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingStore) {
            await supabase.from('couriers').insert({
                name: 'Shopify',
                status: 'active',
                user_id: userId,
                created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existingStore.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 6);

        return NextResponse.json({
            success: true,
            message: `Shopify connected. ${stats.totalOrders} total orders on your store. ${count || 0} synced to database.`,
            syncedOrders: count || 0,
            totalOnShopify: stats.totalOrders,
        });
    } catch (error) {
        console.error('[Shopify Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

---

## Step 4 — Create Webhook Route (Real-Time Orders)

This is the key advantage over Daraz — Shopify can push orders to your app the moment they're placed. Create this route:

### `app/api/shopify/webhook/route.js`

```js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

/**
 * Verify Shopify webhook signature.
 * Shopify sends HMAC-SHA256 of the raw body using the webhook secret.
 * Header: X-Shopify-Hmac-Sha256 (base64 encoded)
 */
function verifyWebhookSignature(rawBody, hmacHeader, secret) {
    const digest = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf-8')
        .digest('base64');
    return digest === hmacHeader;
}

/**
 * Normalize a Shopify webhook order payload to your unified schema.
 * (Same logic as in shopifyService.js normalizeOrder)
 */
function normalizeWebhookOrder(sOrder) {
    const customer = sOrder.customer || {};
    const billing  = sOrder.billing_address || sOrder.shipping_address || {};
    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Guest';

    const mapStatus = (financialStatus, fulfillmentStatus, cancelledAt) => {
        if (cancelledAt) return 'cancelled';
        const fS = (fulfillmentStatus || '').toLowerCase();
        if (fS === 'fulfilled') return 'delivered';
        if (fS === 'partial')   return 'processing';
        const pS = (financialStatus || '').toLowerCase();
        if (pS === 'refunded' || pS === 'partially_refunded') return 'refunded';
        if (pS === 'voided')  return 'cancelled';
        if (pS === 'paid')    return 'processing';
        return 'pending';
    };

    return {
        platformOrderId: sOrder.id?.toString(),
        number: sOrder.order_number || sOrder.name || sOrder.id,
        status: mapStatus(sOrder.financial_status, sOrder.fulfillment_status, sOrder.cancelled_at),
        date: sOrder.created_at,
        customerName,
        customerEmail: customer.email || sOrder.email || '',
        customerPhone: billing.phone || customer.phone || '',
        city: billing.city || '',
        total: parseFloat(sOrder.total_price || 0),
        currency: sOrder.currency || 'PKR',
        paymentMethod: sOrder.gateway || (sOrder.payment_gateway_names?.[0]) || '',
        items: (sOrder.line_items || []).map(item => ({
            name: item.title || 'Item',
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0),
            subtotal: parseFloat(item.price || 0) * (item.quantity || 1),
            sku: item.sku || '',
            variant: item.variant_title || '',
        })),
    };
}

export async function POST(request) {
    // userId is passed as a query param: /api/shopify/webhook?userId=USER_ID
    // (Shopify webhooks don't support custom headers, so we use query params)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Read raw body (needed for signature verification)
    const rawBody = await request.text();
    const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
    const topic     = request.headers.get('X-Shopify-Topic');  // e.g. 'orders/create'

    // Fetch user's webhook secret from Supabase
    const { data: user } = await supabase
        .from('users')
        .select('shopify_webhook_secret, shopify_store_domain')
        .eq('id', userId)
        .single();

    const webhookSecret = user?.shopify_webhook_secret;

    // Verify signature only if webhook secret is stored
    if (webhookSecret && hmacHeader) {
        const valid = verifyWebhookSignature(rawBody, hmacHeader, webhookSecret);
        if (!valid) {
            console.warn('[Shopify Webhook] Invalid HMAC signature for user', userId);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    }

    // Only process order events
    if (!topic?.startsWith('orders/')) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    let order;
    try {
        order = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const normalized = normalizeWebhookOrder(order);

    try {
        // Upsert customer
        let customerId = null;
        const phone = normalized.customerPhone;

        if (phone) {
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', phone)
                .eq('user_id', userId)
                .maybeSingle();

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const { data: newCustomer } = await supabase
                    .from('customers')
                    .insert({
                        name: normalized.customerName,
                        phone,
                        email: normalized.customerEmail || null,
                        city: normalized.city || null,
                        user_id: userId,
                    })
                    .select('id')
                    .single();
                customerId = newCustomer?.id;
            }
        }

        // Upsert order (platform_id = 6 for Shopify)
        const { data: upsertedOrder } = await supabase
            .from('orders')
            .upsert({
                platform_order_id: normalized.platformOrderId,
                platform_id: 6,
                status: normalized.status,
                total_amount: normalized.total,
                currency: normalized.currency,
                customer_id: customerId,
                user_id: userId,
                created_at: normalized.date,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'platform_order_id,user_id' })
            .select('id')
            .single();

        // Upsert order items
        if (upsertedOrder && normalized.items.length > 0) {
            const items = normalized.items.map(item => ({
                order_id: upsertedOrder.id,
                name: item.name,
                sku: item.sku || null,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                user_id: userId,
            }));
            await supabase
                .from('order_items')
                .upsert(items, { onConflict: 'order_id,sku' });
        }

        console.log(`[Shopify Webhook] ${topic} processed for user ${userId}, order ${normalized.platformOrderId}`);
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Shopify Webhook Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

> **Note:** Add `shopify_webhook_secret` column to Supabase too if you want signature verification:
> ```sql
> ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_webhook_secret TEXT;
> ```

---

## Step 5 — Fix `ShopifyManagePage.jsx`

Two problems in the current file:

### 5a. Add `x-user-id` header to the fetch call

Find line ~109:
```js
const res = await fetch(`/api/shopify/orders?${params}`);
```
Replace with:
```js
const userId = getCurrentUserId(); // import getCurrentUserId from wherever it's used elsewhere in this file
const res = await fetch(`/api/shopify/orders?${params}`, {
    headers: { 'x-user-id': userId },
});
```

### 5b. Fix the hardcoded error message

Find:
```js
setError("Shopify is not configured. Please add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to your .env.local and restart the server.");
```
Replace with:
```js
setError("Shopify is not configured. Add your Store Domain and Access Token in Settings → Stores → Shopify.");
```

### 5c. Add a credentials config panel (optional)

Add a side panel that lets the user enter credentials in-app. The fields are:

| Field label | Supabase column | Example value |
|---|---|---|
| Store Domain | `shopify_store_domain` | `my-store.myshopify.com` |
| Admin API Access Token | `shopify_access_token` | `shpat_xxxxxxxxxxxx` |
| Webhook Secret (optional) | `shopify_webhook_secret` | from Shopify webhook settings |

Save these via `PATCH /api/users/credentials` or direct Supabase update with the user's session.

---

## Step 6 — Check SettingsPage.jsx (Already Mostly Done)

The `useShopifyStats` hook at line 100 already sends `x-user-id` header. The `ShopifyCard` at line 568 and manage route at line 1362 already exist.

The only thing to verify is that `handleShopifySync` exists and calls `POST /api/shopify/sync`. Search SettingsPage for `handleShopifySync`. If it's missing, add it:

```js
const [shopifySyncing, setShopifySyncing] = useState(false);

const handleShopifySync = async () => {
    setShopifySyncing(true);
    try {
        const res = await fetch('/api/shopify/sync', {
            method: 'POST',
            headers: { 'x-user-id': userId },
        });
        const data = await res.json();
        if (data.success) {
            // show toast: data.message
        } else {
            // show error: data.error
        }
    } catch (e) {
        console.error(e);
    } finally {
        setShopifySyncing(false);
    }
};
```

---

## Step 7 — Getting Shopify Credentials

Here is what the user needs to do in their Shopify Admin:

1. Log in to **Shopify Admin** → go to **Settings** (bottom left)
2. Click **Apps and sales channels** → click **Develop apps**
3. Click **Allow custom app development** (first time only)
4. Click **Create an app** → give it a name like "Zyro Dashboard"
5. Click **Configure Admin API scopes** — enable these scopes:
   - `read_orders`
   - `read_customers`
   - `read_products`
   - `read_inventory` (optional, for stock tracking)
6. Click **Save**
7. Click **Install app** → confirm
8. Copy the **Admin API access token** (starts with `shpat_`) — this is `shopify_access_token`
9. Your store domain is visible in the Shopify Admin URL: `{your-store}.myshopify.com` — this is `shopify_store_domain`

> **Important:** The access token is only shown ONCE after installation. Save it immediately. If lost, you must uninstall and reinstall the app.

---

## Step 8 — Registering Shopify Webhooks (For Real-Time Orders)

After credentials are saved, register webhooks so Shopify pushes orders instantly. You can register webhooks two ways:

### Option A: Register via Shopify Admin (Simple)

1. In Shopify Admin → **Settings** → **Notifications** → scroll to **Webhooks**
2. Click **Create webhook**
3. Choose event: `Order creation`
4. Format: `JSON`
5. URL: `https://your-zyro-domain.com/api/shopify/webhook?userId=YOUR_USER_ID`
6. Click **Save** → copy the **Signing secret** → save it as `shopify_webhook_secret` in your user's row in Supabase

Repeat for `Order payment` and `Order update` if needed.

### Option B: Register via API (Programmatic)

Add this to your `sync/route.js` after authentication succeeds:

```js
// Register order/create webhook programmatically
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/webhook?userId=${userId}`;

const webhookRes = await fetch(`https://${storeDomain}/admin/api/2024-01/webhooks.json`, {
    method: 'POST',
    headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        webhook: {
            topic: 'orders/create',
            address: webhookUrl,
            format: 'json',
        },
    }),
});

const webhookData = await webhookRes.json();
// Store webhookData.webhook.id if you want to deregister later
```

---

## Step 9 — Optional: Full Order Sync to Supabase

### `app/api/shopify/sync-orders/route.js`

```js
import { NextResponse } from 'next/server';
import { getShopifyOrders, isShopifyConfigured } from '@/lib/services/shopifyService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('shopify_store_domain, shopify_access_token')
            .eq('id', userId)
            .single();

        const { shopify_store_domain: storeDomain, shopify_access_token: accessToken } = user || {};

        if (!isShopifyConfigured(storeDomain, accessToken)) {
            return NextResponse.json({ error: 'Not configured' }, { status: 400 });
        }

        const creds = { storeDomain, accessToken };
        const { orders } = await getShopifyOrders(creds, { page: 1, perPage: 250, status: 'all' });

        let upserted = 0;

        for (const order of orders) {
            let customerId = null;
            const phone = order.customerPhone;

            if (phone) {
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', phone)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                } else {
                    const { data: newCustomer } = await supabase
                        .from('customers')
                        .insert({
                            name: order.customerName,
                            phone,
                            email: order.customerEmail || null,
                            city: order.city || null,
                            user_id: userId,
                        })
                        .select('id')
                        .single();
                    customerId = newCustomer?.id;
                }
            }

            const { data: upsertedOrder } = await supabase
                .from('orders')
                .upsert({
                    platform_order_id: order.id.toString(),
                    platform_id: 6,
                    status: order.status,
                    total_amount: order.total,
                    currency: order.currency,
                    customer_id: customerId,
                    user_id: userId,
                    created_at: order.date,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'platform_order_id,user_id' })
                .select('id')
                .single();

            if (upsertedOrder && order.items.length > 0) {
                const items = order.items.map(item => ({
                    order_id: upsertedOrder.id,
                    name: item.name,
                    sku: item.sku || null,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                    user_id: userId,
                }));
                await supabase
                    .from('order_items')
                    .upsert(items, { onConflict: 'order_id,sku' });
            }

            upserted++;
        }

        return NextResponse.json({ success: true, synced: upserted });
    } catch (error) {
        console.error('[Shopify Sync Orders Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

---

## Implementation Checklist

- [ ] Run Supabase SQL migration — add `shopify_store_domain`, `shopify_access_token` columns (Step 1)
- [ ] (Optional) Add `shopify_webhook_secret` column for webhook verification
- [ ] Refactor `lib/services/shopifyService.js` to accept `creds` param (Step 2)
- [ ] Create `app/api/shopify/orders/route.js` (Step 3a)
- [ ] Create `app/api/shopify/stats/route.js` (Step 3b)
- [ ] Create `app/api/shopify/sync/route.js` (Step 3c)
- [ ] Create `app/api/shopify/webhook/route.js` for real-time push (Step 4)
- [ ] Fix `ShopifyManagePage.jsx` — add `x-user-id` header + fix error message (Step 5)
- [ ] Verify `SettingsPage.jsx` has `handleShopifySync` (Step 6)
- [ ] User creates Shopify Custom App and saves credentials via the UI (Step 7)
- [ ] User registers webhook URL in Shopify Admin or via API (Step 8)
- [ ] (Optional) Create `sync-orders` route for bulk DB persistence (Step 9)

---

## Comparison: Shopify vs Daraz vs WooCommerce

| Feature | WooCommerce | Shopify | Daraz |
|---------|-------------|---------|-------|
| Real-time webhooks | Yes (push) | Yes (push) | No (pull only) |
| Auth method | Consumer Key + Secret (Basic Auth) | `X-Shopify-Access-Token` header | HMAC-SHA256 request signing |
| Webhook verification | HMAC-SHA256 of body | HMAC-SHA256 of body | N/A |
| Customer names | Always full | Always full | May be masked (DataMoat) |
| Search | Name/email/phone | Name/email/order# | Order ID only |
| Pagination | Page-based | Cursor-based (Link header) | Offset-based |
| Max orders per request | 100 | 250 | 100 |
| Platform ID in DB | 1 | 6 | 5 |
| Supabase columns | `woocommerce_url/key/secret` | `shopify_store_domain/access_token` | `daraz_app_key/secret/access_token` |
| Setup difficulty | Medium (webhook URL + keys) | Easy (one token) | Hard (HMAC signing + DataMoat) |

---

## Shopify API Rate Limits

Shopify Admin REST API uses a **leaky bucket** model:
- **40 requests/second** bucket, refills at 2 requests/second
- Each API call costs 1 bucket unit
- Response headers include `X-Shopify-Shop-Api-Call-Limit: used/max` (e.g. `12/40`)
- If you hit the limit, Shopify returns `429 Too Many Requests` with a `Retry-After` header
- For large bulk sync operations, add a 500ms delay between batches to stay safe
