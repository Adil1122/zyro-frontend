# Daraz Integration — Step-by-Step Implementation Guide

## Overview

Daraz uses **pull-only** order syncing (no merchant webhooks). Every request is authenticated with **HMAC-SHA256 request signing** via the Daraz Open Platform. Credentials are stored per-user in Supabase (not `.env.local`), following the same pattern as TCS and Leopards.

**Platform ID for Daraz orders in your DB: `5`**

---

## What Already Exists

| File | Status |
|------|--------|
| `lib/services/darazService.js` | Exists but reads creds from `process.env` — must be refactored |
| `components/dashboard/pages/DarazManagePage.jsx` | Exists but has no config panel and hits `/api/daraz/orders` with no auth header |
| `app/api/daraz/` | Empty directory — all 3 route files need to be created |
| SettingsPage.jsx | Daraz card/hook not wired up yet |

---

## Step 1 — Supabase Schema Migration

Run this SQL in your Supabase SQL Editor (or via migration file):

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daraz_app_key      TEXT,
  ADD COLUMN IF NOT EXISTS daraz_app_secret   TEXT,
  ADD COLUMN IF NOT EXISTS daraz_access_token TEXT;
```

That's all you need — no separate couriers table entry required (the sync route handles that).

---

## Step 2 — Refactor `lib/services/darazService.js`

The current file reads credentials from `process.env`. Refactor every function to accept a `creds` object `{ appKey, appSecret, accessToken, region }` instead.

### 2a. Remove `getBaseUrl()` and replace with a helper

```js
function getBaseUrl(region = 'pk') {
    return REGION_BASE_URL[region.toLowerCase()] || REGION_BASE_URL['pk'];
}
```

### 2b. Refactor `buildSystemParams()` to accept credentials

```js
function buildSystemParams(creds, extraParams = {}) {
    const { appKey, accessToken, appSecret } = creds;
    const params = {
        app_key: appKey,
        access_token: accessToken,
        timestamp: Date.now().toString(),
        sign_method: 'sha256',
        ...extraParams,
    };
    return { params, appSecret };
}
```

### 2c. Refactor `darazGet()` to accept credentials

```js
async function darazGet(creds, apiPath, extra = {}) {
    const { params, appSecret } = buildSystemParams(creds, extra);
    const sign = generateSignature(apiPath, params, appSecret);
    const qs = new URLSearchParams({ ...params, sign }).toString();
    const url = `${getBaseUrl(creds.region)}${apiPath}?${qs}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Daraz API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    if (json.code && json.code !== '0' && json.code !== 0) {
        throw new Error(`Daraz API: [${json.code}] ${json.message || 'Unknown error'}`);
    }
    return json.data ?? json.result ?? json;
}
```

### 2d. Refactor `isDarazConfigured()` to accept params

```js
export function isDarazConfigured(appKey, appSecret, accessToken) {
    return !!(
        appKey && appSecret && accessToken &&
        !appKey.includes('your_daraz') &&
        !accessToken.includes('your_daraz')
    );
}
```

### 2e. Refactor `getDarazStats()` to accept `creds`

```js
export async function getDarazStats(creds) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const toISO = (d) => d.toISOString();

    const todayData = await darazGet(creds, '/orders/get', {
        created_after: toISO(todayStart),
        created_before: toISO(new Date()),
        status: 'unpaid,pending,processing,packed,shipped,delivered',
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: 100,
        offset: 0,
    });

    const todayOrders = todayData?.orders || [];
    const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const totalData = await darazGet(creds, '/orders/get', {
        created_after: toISO(ninetyDaysAgo),
        created_before: toISO(new Date()),
        status: 'unpaid,pending,processing,packed,shipped,delivered,canceled,returned',
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: 100,
        offset: 0,
    });

    const totalOrderCount = totalData?.count_total ?? (totalData?.orders?.length ?? 0);
    const totalRevenue = (totalData?.orders || []).reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

    return {
        totalOrders: totalOrderCount,
        totalRevenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        currency: 'PKR',
        period: 'last 90 days',
    };
}
```

### 2f. Refactor `getDarazOrders()` to accept `creds`

```js
export async function getDarazOrders(creds, { page = 1, perPage = 10, search = '', status = 'all' } = {}) {
    const offset = (page - 1) * perPage;
    const params = {
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: perPage,
        offset,
    };

    if (status && status !== 'all') {
        params.status = status;
    } else {
        params.status = 'unpaid,pending,processing,packed,shipped,delivered,canceled,returned';
    }

    const data = await darazGet(creds, '/orders/get', params);
    let orders = (data?.orders || []).map(normalizeOrder);

    if (search) {
        orders = orders.filter(o =>
            o.id.toString().includes(search) ||
            o.number.toString().includes(search)
        );
    }

    const totalOrders = data?.count_total ?? orders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

    return {
        orders,
        pagination: { page, perPage, totalOrders, totalPages },
    };
}
```

The `normalizeOrder` and `mapDarazStatus` functions at the bottom of the file do not touch credentials — leave them unchanged.

---

## Step 3 — Create API Routes

Create these three files. Each follows the exact same pattern as the Leopards routes.

### 3a. `app/api/daraz/orders/route.js`

```js
import { NextResponse } from 'next/server';
import { getDarazOrders, isDarazConfigured } from '@/lib/services/darazService';
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
            .select('daraz_app_key, daraz_app_secret, daraz_access_token')
            .eq('id', userId)
            .single();

        const { daraz_app_key: appKey, daraz_app_secret: appSecret, daraz_access_token: accessToken } = user || {};

        if (!isDarazConfigured(appKey, appSecret, accessToken)) {
            return NextResponse.json({ configured: false, orders: [], pagination: { page: 1, perPage, totalOrders: 0, totalPages: 1 } });
        }

        const creds = { appKey, appSecret, accessToken, region: 'pk' };
        const result = await getDarazOrders(creds, { page, perPage, search, status });

        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        console.error('[Daraz Orders Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

### 3b. `app/api/daraz/stats/route.js`

```js
import { NextResponse } from 'next/server';
import { getDarazStats, isDarazConfigured } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_access_token')
            .eq('id', userId)
            .single();

        const { daraz_app_key: appKey, daraz_app_secret: appSecret, daraz_access_token: accessToken } = user || {};

        if (!isDarazConfigured(appKey, appSecret, accessToken)) {
            return NextResponse.json({ configured: false });
        }

        const creds = { appKey, appSecret, accessToken, region: 'pk' };
        const stats = await getDarazStats(creds);

        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Daraz Stats Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

### 3c. `app/api/daraz/sync/route.js`

This route verifies the connection and upserts the Daraz courier row in Supabase. It mirrors the Leopards sync route exactly.

```js
import { NextResponse } from 'next/server';
import { getDarazStats, isDarazConfigured } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_access_token')
            .eq('id', userId)
            .single();

        const { daraz_app_key: appKey, daraz_app_secret: appSecret, daraz_access_token: accessToken } = user || {};

        if (!isDarazConfigured(appKey, appSecret, accessToken)) {
            return NextResponse.json({ error: 'Daraz credentials not configured' }, { status: 400 });
        }

        // Verify by calling stats — if it throws, credentials are bad
        const creds = { appKey, appSecret, accessToken, region: 'pk' };
        let stats;
        try {
            stats = await getDarazStats(creds);
        } catch (e) {
            return NextResponse.json({ error: 'Daraz authentication failed: ' + e.message }, { status: 502 });
        }

        // Upsert the Daraz courier row
        const { data: existingCourier } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'Daraz')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingCourier) {
            await supabase.from('couriers').insert({
                name: 'Daraz',
                status: 'active',
                user_id: userId,
                created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existingCourier.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 5);

        return NextResponse.json({
            success: true,
            message: `Daraz connected. ${stats.totalOrders} orders found on Daraz (last 90 days). ${count || 0} synced to database.`,
            syncedOrders: count || 0,
        });
    } catch (error) {
        console.error('[Daraz Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

---

## Step 4 — Update `DarazManagePage.jsx`

The current page hits `/api/daraz/orders` but doesn't send the `x-user-id` header, and shows a hardcoded env-based error message when not configured. Fix both things.

### 4a. Import user context at the top of the file

DarazManagePage needs the current user ID. Look at how TCSManagePage or LeopardsManagePage imports the user — copy the same pattern. It typically comes from a `useUser()` hook or is passed as a prop.

### 4b. Add `x-user-id` header to all fetch calls

Find every `fetch('/api/daraz/...')` call in the file and add the header:

```js
const res = await fetch(`/api/daraz/orders?${params}`, {
    headers: { 'x-user-id': userId },
});
```

### 4c. Replace the hardcoded error message

The current error message says:
> "Daraz is not configured. Please add DARAZ_APP_KEY, DARAZ_APP_SECRET and DARAZ_ACCESS_TOKEN to your .env.local and restart the server."

Replace that with:
```
"Daraz is not configured. Please add your App Key, App Secret, and Access Token in Settings → Couriers → Daraz."
```

Or better: when `data.configured === false`, show the credentials config panel (see Step 5) instead of an error.

### 4d. Add a credentials config panel (optional but recommended)

Add a collapsed side panel that allows entering credentials directly in the manage page, similar to TCSManagePage. The fields are:

| Field label | Supabase column | Where to get it |
|---|---|---|
| App Key | `daraz_app_key` | open.daraz.com → App Console |
| App Secret | `daraz_app_secret` | open.daraz.com → App Console |
| Access Token | `daraz_access_token` | Self-Authorization on App Console |

Save endpoint: `PATCH /api/users/me` or directly via a Supabase client update with the user's session.

---

## Step 5 — Wire Up `SettingsPage.jsx`

Follow the exact pattern used for Leopards. Open `components/dashboard/pages/SettingsPage.jsx` and make these 5 additions:

### 5a. Add import at the top

```js
import DarazManagePage from './DarazManagePage';
```

### 5b. Add `useDarazStats` hook (near the other useXxxStats hooks)

```js
const [darazStats, setDarazStats] = useState(null);

useEffect(() => {
    if (!userId) return;
    fetch('/api/daraz/stats', { headers: { 'x-user-id': userId } })
        .then(r => r.json())
        .then(data => { if (data.configured) setDarazStats(data); })
        .catch(() => {});
}, [userId]);
```

### 5c. Add sync state and handler (near the other handleXxxSync functions)

```js
const [darazSyncing, setDarazSyncing] = useState(false);

const handleDarazSync = async () => {
    setDarazSyncing(true);
    try {
        const res = await fetch('/api/daraz/sync', {
            method: 'POST',
            headers: { 'x-user-id': userId },
        });
        const data = await res.json();
        if (data.success) {
            // show success toast or update stats
        } else {
            // show error toast
        }
    } catch (e) {
        console.error(e);
    } finally {
        setDarazSyncing(false);
    }
};
```

### 5d. Add `DarazCard` component (near the other XxxCard components in the render)

```jsx
{managingStore === 'daraz' ? (
    <DarazManagePage onBack={() => setManagingStore(null)} />
) : (
    <DarazCard
        stats={darazStats}
        onManage={() => setManagingStore('daraz')}
        onSync={handleDarazSync}
        syncing={darazSyncing}
    />
)}
```

### 5e. Define the `DarazCard` inline (or extract to a component)

Copy the structure of `LeopardsCard` or `TCSCard` — they render a card with:
- A logo/icon (use 🏪 or the Daraz orange gradient box from DarazManagePage header)
- Stats: total orders, total revenue, today's orders
- Two buttons: "Manage" and "Sync"
- A "Not configured" state when `stats === null`

The Daraz brand color is `#F57D29` (orange).

---

## Step 6 — Getting Daraz API Credentials

This is what users need to do once to get their credentials:

1. Go to **https://open.daraz.pk** and sign in with your seller account
2. Click **"Create App"** — fill in App Name and description
3. After creation, copy:
   - **App Key** → this is `daraz_app_key`
   - **App Secret** → this is `daraz_app_secret`
4. Click **"Self Authorization"** in the App Console
5. Select your seller account and authorize
6. Copy the **Access Token** → this is `daraz_access_token`

> **Important:** Access Tokens expire (default 30 days for some apps, permanent for others). If orders stop loading, the token has expired — re-authorize in the App Console.

> **DataMoat Warning:** Customer names and phone numbers are masked by Daraz's privacy system by default. To get real names/phones, apply for **Sensitive Data Privilege** inside the App Console. Without this, `customerName` will appear as `"Masked / Guest"` and phone will be empty.

---

## Step 7 — Optional: Sync Orders to Supabase (Full Sync)

If you want Daraz orders stored in your `orders` table (not just fetched live), add a sync route that pulls and upserts:

### `app/api/daraz/sync-orders/route.js`

```js
import { NextResponse } from 'next/server';
import { getDarazOrders, isDarazConfigured } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_access_token')
            .eq('id', userId)
            .single();

        const { daraz_app_key: appKey, daraz_app_secret: appSecret, daraz_access_token: accessToken } = user || {};

        if (!isDarazConfigured(appKey, appSecret, accessToken)) {
            return NextResponse.json({ error: 'Not configured' }, { status: 400 });
        }

        const creds = { appKey, appSecret, accessToken, region: 'pk' };

        // Fetch up to 100 recent orders (Daraz API max per request)
        const { orders } = await getDarazOrders(creds, { page: 1, perPage: 100, status: 'all' });

        let upserted = 0;

        for (const order of orders) {
            // Upsert customer
            let customerId = null;
            if (order.customerPhone) {
                const phone = order.customerPhone; // already normalized by normalizeOrder
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

            // Upsert order (platform_id = 5 for Daraz)
            const { data: upsertedOrder } = await supabase
                .from('orders')
                .upsert({
                    platform_order_id: order.id.toString(),
                    platform_id: 5,
                    status: order.status,
                    total_amount: order.total,
                    currency: 'PKR',
                    customer_id: customerId,
                    user_id: userId,
                    created_at: order.date,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'platform_order_id,user_id' })
                .select('id')
                .single();

            // Upsert order items
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
                await supabase.from('order_items').upsert(items, { onConflict: 'order_id,sku' });
            }

            upserted++;
        }

        return NextResponse.json({ success: true, synced: upserted });
    } catch (error) {
        console.error('[Daraz Sync Orders Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

Add a "Sync Orders to DB" button in DarazManagePage that calls `POST /api/daraz/sync-orders`.

---

## Step 8 — Optional: Auto-Sync via Cron

Daraz has no webhooks, so to keep orders fresh you can poll on a schedule.

In Next.js App Router, create `app/api/cron/daraz/route.js`:

```js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Called by Vercel Cron or an external scheduler
export async function GET(request) {
    // Protect with a secret header
    const secret = request.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users who have Daraz configured
    const { data: users } = await supabase
        .from('users')
        .select('id, daraz_app_key, daraz_app_secret, daraz_access_token')
        .not('daraz_app_key', 'is', null)
        .not('daraz_access_token', 'is', null);

    // For each user, trigger their sync
    for (const user of users || []) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/daraz/sync-orders`, {
            method: 'POST',
            headers: { 'x-user-id': user.id },
        });
    }

    return NextResponse.json({ ok: true, processed: users?.length || 0 });
}
```

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daraz",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

This pulls Daraz orders for all users every 30 minutes.

---

## Implementation Checklist

- [ ] Run Supabase SQL migration (Step 1)
- [ ] Refactor `lib/services/darazService.js` to accept `creds` param (Step 2)
- [ ] Create `app/api/daraz/orders/route.js` (Step 3a)
- [ ] Create `app/api/daraz/stats/route.js` (Step 3b)
- [ ] Create `app/api/daraz/sync/route.js` (Step 3c)
- [ ] Update `DarazManagePage.jsx` with `x-user-id` header (Step 4)
- [ ] Wire Daraz into `SettingsPage.jsx` (Step 5)
- [ ] User adds their Daraz App credentials via the UI (Step 6)
- [ ] (Optional) Create `sync-orders` route for DB persistence (Step 7)
- [ ] (Optional) Add Vercel cron for auto-sync (Step 8)

---

## Key Differences vs WooCommerce

| Feature | WooCommerce | Daraz |
|---------|-------------|-------|
| Order ingestion | Webhook push (real-time) | Pull-only (manual/cron) |
| Auth | Consumer Key + Secret (Basic Auth) | HMAC-SHA256 signed requests |
| Credentials source | Per-user in Supabase `users` table | Per-user in Supabase `users` table |
| Customer names | Always full name | May be masked (DataMoat) |
| Search | By name, email, phone | By Order ID only |
| Platform ID | 1 | 5 |
| Courier booking | Via TCS/Leopards API after order received | N/A (Daraz ships themselves) |

---

## Daraz API Rate Limits

- Max **100 orders** per `/orders/get` request
- No official published rate limit, but in practice: stay under **60 requests/minute**
- For large sellers with 1000s of orders, implement pagination: loop with `offset += 100` until `count_total` is reached
- Cache stats (don't call `/orders/get` on every page load) — use Supabase counts where possible
