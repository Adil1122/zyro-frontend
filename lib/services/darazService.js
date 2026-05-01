import crypto from 'crypto';

/**
 * Daraz Open Platform Service — NestJS-style singleton service
 *
 * Authentication method: HMAC-SHA256 Request Signing
 * Every request must include:
 *   app_key, timestamp, sign_method=sha256, access_token, sign (computed)
 *
 * ENV VARS required in .env.local:
 *   DARAZ_APP_KEY       — from open.daraz.com App Console
 *   DARAZ_APP_SECRET    — from open.daraz.com App Console
 *   DARAZ_ACCESS_TOKEN  — from Self Authorization on App Console
 *   DARAZ_REGION        — 'pk' for Pakistan (default)
 *
 * API Documentation: https://open.daraz.com/doc/api
 */

// ─── Region → Base URL map ─────────────────────────────────────────────────
const REGION_BASE_URL = {
    pk: 'https://api.daraz.pk/rest',
    bd: 'https://api.daraz.com.bd/rest',
    lk: 'https://api.daraz.lk/rest',
    my: 'https://api.lazada.com.my/rest',
    sg: 'https://api.lazada.sg/rest',
    th: 'https://api.lazada.co.th/rest',
    ph: 'https://api.lazada.com.ph/rest',
    id: 'https://api.lazada.co.id/rest',
    vn: 'https://api.lazada.vn/rest',
};

function getBaseUrl() {
    const region = (process.env.DARAZ_REGION || 'pk').toLowerCase();
    return REGION_BASE_URL[region] || REGION_BASE_URL['pk'];
}

/**
 * Generates the HMAC-SHA256 signature required by Daraz Open Platform.
 *
 * Algorithm:
 * 1. Sort all params alphabetically by key name
 * 2. Concatenate: apiPath + key1value1key2value2...
 * 3. HMAC-SHA256 the result using appSecret as key
 * 4. Return as uppercase hex
 */
function generateSignature(apiPath, params, appSecret) {
    const sortedKeys = Object.keys(params).sort();
    let base = apiPath;
    for (const key of sortedKeys) {
        base += key + params[key];
    }
    return crypto
        .createHmac('sha256', appSecret)
        .update(base, 'utf-8')
        .digest('hex')
        .toUpperCase();
}

/**
 * Builds the common system params required in every Daraz API request.
 */
function buildSystemParams(extraParams = {}) {
    const appKey = process.env.DARAZ_APP_KEY;
    const appSecret = process.env.DARAZ_APP_SECRET;
    const token = process.env.DARAZ_ACCESS_TOKEN;

    const params = {
        app_key: appKey,
        access_token: token,
        timestamp: Date.now().toString(),
        sign_method: 'sha256',
        ...extraParams,
    };

    return { params, appSecret };
}

/**
 * Makes a signed GET request to the Daraz Open Platform.
 * @param {string} apiPath  - e.g. '/orders/get'
 * @param {object} extra    - additional business params
 */
async function darazGet(apiPath, extra = {}) {
    const { params, appSecret } = buildSystemParams(extra);
    const sign = generateSignature(apiPath, params, appSecret);

    const qs = new URLSearchParams({ ...params, sign }).toString();
    const url = `${getBaseUrl()}${apiPath}?${qs}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Daraz API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();

    // Daraz wraps responses in { code, type, message, result }
    if (json.code && json.code !== '0' && json.code !== 0) {
        throw new Error(`Daraz API: [${json.code}] ${json.message || 'Unknown error'}`);
    }

    return json.data ?? json.result ?? json;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function isDarazConfigured() {
    const { DARAZ_APP_KEY, DARAZ_APP_SECRET, DARAZ_ACCESS_TOKEN } = process.env;
    return !!(
        DARAZ_APP_KEY &&
        DARAZ_APP_SECRET &&
        DARAZ_ACCESS_TOKEN &&
        !DARAZ_APP_KEY.includes('your_daraz') &&
        !DARAZ_ACCESS_TOKEN.includes('your_daraz')
    );
}

/**
 * Fetch live stats: total orders (last 90 days), today's orders & revenue
 */
export async function getDarazStats() {
    // Daraz doesn't have a single "total sales" report endpoint
    // We fetch orders in batches to build stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Format: ISO 8601 — Daraz expects UTC
    const toISO = (d) => d.toISOString();

    // Fetch today's orders
    const todayData = await darazGet('/orders/get', {
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

    // Fetch last 90-day totals (use count only for stats)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const totalData = await darazGet('/orders/get', {
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

/**
 * Fetch paginated orders list
 * Daraz uses offset-based pagination (not page-based)
 * @param {number} page      - 1-based page number (converted to offset internally)
 * @param {number} perPage   - items per page (max 100)
 * @param {string} search    - search by order ID (Daraz doesn't support name search)
 * @param {string} status    - 'all' | 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'canceled' | 'returned'
 */
export async function getDarazOrders({ page = 1, perPage = 10, search = '', status = 'all' } = {}) {
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

    // Daraz does not support free-text customer search — filter by order ID locally
    const data = await darazGet('/orders/get', params);

    let orders = (data?.orders || []).map(normalizeOrder);

    // Client-side filter by order ID if search provided
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
        pagination: {
            page,
            perPage,
            totalOrders,
            totalPages,
        },
    };
}

// ─── Normalizer: convert Daraz order → unified internal schema ───────────────
function normalizeOrder(dOrder) {
    // Daraz order items are fetched separately; available if present
    const items = (dOrder.order_items || []).map(item => ({
        name: item.name || item.sku || 'Item',
        quantity: parseInt(item.quantity || 1, 10),
        price: parseFloat(item.item_price || 0),
        subtotal: parseFloat(item.paid_price || 0),
        sku: item.seller_sku || item.sku || '',
        status: item.status || '',
    }));

    // Customer name may be masked by Daraz (DataMoat)
    const firstName = dOrder.customer_first_name || '';
    const lastName = dOrder.customer_last_name || '';
    const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Masked / Guest';

    return {
        id: dOrder.order_id,
        number: dOrder.order_number || dOrder.order_id,
        status: mapDarazStatus(dOrder.statuses || dOrder.status || 'pending'),
        date: dOrder.created_at,
        customerName,
        customerEmail: dOrder.customer_email || '',
        customerPhone: dOrder.address_billing?.phone || '',
        city: dOrder.address_billing?.city || dOrder.address_shipping?.city || '',
        total: parseFloat(dOrder.price || 0),
        currency: 'PKR',
        paymentMethod: dOrder.payment_method || '',
        itemCount: parseInt(dOrder.items_count || items.length || 1, 10),
        items,
    };
}

/** Map Daraz raw statuses to our unified UI status labels */
function mapDarazStatus(rawStatus) {
    const statusStr = Array.isArray(rawStatus) ? rawStatus.join(',') : String(rawStatus || '');
    if (statusStr.includes('delivered')) return 'delivered';
    if (statusStr.includes('shipped')) return 'shipped';
    if (statusStr.includes('packed')) return 'packed';
    if (statusStr.includes('processing')) return 'processing';
    if (statusStr.includes('returned')) return 'returned';
    if (statusStr.includes('canceled') || statusStr.includes('cancelled')) return 'cancelled';
    if (statusStr.includes('unpaid')) return 'pending';
    if (statusStr.includes('pending')) return 'pending';
    return 'pending';
}
