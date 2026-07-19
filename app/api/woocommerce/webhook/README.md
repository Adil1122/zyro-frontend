# WooCommerce Webhooks — Zyro Integration

This document covers how WooCommerce webhooks are implemented in Zyro, how to register them, and how to extend them.

---

## Current Webhook

### `POST /api/woocommerce/webhook`

Receives real-time order events from WooCommerce and syncs them into Zyro's database.

**URL format:**
```
https://yourdomain.com/api/woocommerce/webhook?userId={zyro_user_id}
```

**What it does:**
1. Validates the `userId` from query params against the `users` table
2. Parses the WooCommerce order payload
3. Upserts the **customer** (by email) into the `customers` table
4. Upserts the **order** into the `orders` table with `platform_id = 1`
5. Syncs **order items** into the `order_items` table (matched by SKU or product name)
6. Fires a **WhatsApp notification** when order status is `pending`, `processing`, or `completed`

---

## How to Register in WooCommerce

1. Go to **WooCommerce Admin → Settings → Advanced → Webhooks**
2. Click **Add Webhook**
3. Fill in:
   - **Name:** Zyro Order Created
   - **Status:** Active
   - **Topic:** Order created
   - **Delivery URL:** `https://yourdomain.com/api/woocommerce/webhook?userId=YOUR_USER_ID`
   - **Secret:** *(optional — add to env as `WC_WEBHOOK_SECRET` to verify requests)*
   - **API Version:** WP REST API Integration v3
4. Click **Save**

> Find your `userId` in Zyro → Settings → Account, or from the `zyro_user` object in browser localStorage.

---

## WooCommerce Order Payload (Reference)

```json
{
  "id": 1234,
  "number": "1234",
  "status": "processing",
  "date_created": "2026-07-17T10:30:00",
  "total": "2500.00",
  "billing": {
    "first_name": "Ahmad",
    "last_name": "Khan",
    "email": "ahmad@example.com",
    "phone": "03001234567",
    "city": "Karachi"
  },
  "line_items": [
    {
      "name": "Product Name",
      "quantity": 2,
      "price": "1250.00",
      "sku": "SKU-001"
    }
  ]
}
```

---

## Order Status Mapping

| WooCommerce Status | Behavior in Zyro |
|---|---|
| `pending` | Inserted as new order, WhatsApp notification sent |
| `processing` | Inserted as new order, WhatsApp notification sent |
| `completed` | Inserted or updated, WhatsApp notification sent |
| `on-hold` | Inserted or updated, no notification |
| `cancelled` | Inserted or updated, no notification |
| `refunded` | Inserted or updated, no notification |
| `failed` | Inserted or updated, no notification |

---

## Planned Webhooks

The following webhooks are planned for future implementation:

### 1. `order.updated` — Order Status Changes
**Topic:** `Order updated`
**Use case:** When an order status changes in WooCommerce (e.g. pending → shipped), update the status in Zyro's orders table in real time.

```
POST /api/woocommerce/webhook/order-updated?userId={userId}
```

### 2. `order.deleted` — Order Deleted
**Topic:** `Order deleted`
**Use case:** When an order is deleted or trashed in WooCommerce, mark it as cancelled in Zyro to keep dashboard counts accurate.

```
POST /api/woocommerce/webhook/order-deleted?userId={userId}
```

### 3. `customer.created` — New Customer
**Topic:** `Customer created`
**Use case:** Auto-sync new WooCommerce customers into Zyro's `customers` table without a manual sync.

```
POST /api/woocommerce/webhook/customer-created?userId={userId}
```

### 4. `product.updated` — Stock / Inventory Sync
**Topic:** `Product updated`
**Use case:** When stock changes in WooCommerce (a sale, manual update), reflect it in Zyro inventory. Useful for low-stock alerts.

```
POST /api/woocommerce/webhook/product-updated?userId={userId}
```

### 5. `product.created` — New Product
**Topic:** `Product created`
**Use case:** Auto-add new WooCommerce products to Zyro inventory when published.

```
POST /api/woocommerce/webhook/product-created?userId={userId}
```

### 6. `order.updated` (refund filter) — Refund Tracking
**Topic:** `Order updated`
**Use case:** Catch orders with status `refunded` specifically to update COD recovery stats and flag them in the dashboard.

---

## File Location

```
app/api/woocommerce/
├── webhook/
│   └── route.js      # ← Current implementation (order.created)
├── orders/
│   └── route.js
├── stats/
│   └── route.js
└── sync/
    └── route.js
```

---

## Adding a New WooCommerce Webhook

1. Create a new route file:
```
app/api/woocommerce/webhook/{event-name}/route.js
```

2. Use this base template:
```js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
        const payload = await request.json();

        // handle the event
        console.log('[WC Webhook] Received:', payload);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WC Webhook Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

3. Register the new URL in WooCommerce Admin → Webhooks with the matching topic.

---

## Security (Optional)

To verify requests are genuinely from WooCommerce, add a secret:

```js
const secret = request.headers.get('x-wc-webhook-secret');
if (secret !== process.env.WC_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Add to `.env.local`:
```
WC_WEBHOOK_SECRET=your_secret_here
```

And set the same secret in WooCommerce webhook settings.
