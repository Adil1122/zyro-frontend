/**
 * Shopify Admin API Service — NestJS-style singleton service
 * Uses the Shopify Admin REST API (2024-01) with a Custom App Access Token.
 *
 * Authentication: Private / Custom App — uses X-Shopify-Access-Token header.
 * No external npm package required (fetch-based like Daraz).
 *
 * ENV VARS required in .env.local:
 *   SHOPIFY_STORE_DOMAIN  — e.g. my-store.myshopify.com (without https://)
 *   SHOPIFY_ACCESS_TOKEN  — Admin API access token from your Custom App
 *
 * How to create a Custom App:
 *   1. Shopify Admin → Settings → Apps and sales channels → Develop apps
 *   2. Create an app → Configure Admin API scopes (read_orders, read_products, etc.)
 *   3. Install the app → copy the Admin API access token
 *
 * API Docs: https://shopify.dev/docs/api/admin-rest
 */

const API_VERSION = '2024-01';

function getBaseUrl() {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    if (!domain) return null;
    // Strip any accidental protocol prefix
    const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${clean}/admin/api/${API_VERSION}`;
}

function getHeaders() {
    return {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    };
}

/**
 * Makes an authenticated GET request to the Shopify Admin API.
 * @param {string} endpoint - e.g. '/orders.json'
 * @param {object} params   - query parameters
 */
async function shopifyGet(endpoint, params = {}) {
    const base = getBaseUrl();
    if (!base) throw new Error('Shopify is not configured. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN in .env.local');

    const qs = new URLSearchParams(params).toString();
    const url = `${base}${endpoint}${qs ? '?' + qs : ''}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error ${res.status}: ${body}`);
    }

    return res.json();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if Shopify credentials are configured via env vars
 */
export function isShopifyConfigured() {
    const { SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN } = process.env;
    return !!(
        SHOPIFY_STORE_DOMAIN &&
        SHOPIFY_ACCESS_TOKEN &&
        !SHOPIFY_STORE_DOMAIN.includes('your-shopify') &&
        !SHOPIFY_STORE_DOMAIN.includes('your_shopify') &&
        !SHOPIFY_ACCESS_TOKEN.includes('your_shopify') &&
        !SHOPIFY_ACCESS_TOKEN.includes('shpat_xxxxxxxx')
    );
}

/**
 * Fetch live stats: total orders, total revenue, today's orders & revenue
 */
export async function getShopifyStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch total order count
    const countData = await shopifyGet('/orders/count.json', {
        status: 'any',
    });
    const totalOrders = countData?.count ?? 0;

    // Fetch today's order count
    const todayCountData = await shopifyGet('/orders/count.json', {
        status: 'any',
        created_at_min: todayStart.toISOString(),
    });
    const todayOrders = todayCountData?.count ?? 0;

    // Fetch recent orders for revenue calculation (max 250 per Shopify limit)
    const [allOrdersData, todayOrdersData] = await Promise.all([
        shopifyGet('/orders.json', {
            status: 'any',
            fields: 'id,total_price,currency',
            limit: 250,
        }),
        shopifyGet('/orders.json', {
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

    // Get currency from first order if available
    const currency = allOrders[0]?.currency || todayOrdersList[0]?.currency || 'PKR';

    return {
        totalOrders,
        totalRevenue,
        todayOrders,
        todayRevenue,
        currency,
    };
}

/**
 * Fetch paginated orders list
 * Shopify uses cursor-based pagination with `page_info`, but for simplicity
 * we use `since_id` offset approach combined with limit.
 *
 * @param {number} page      - 1-based page number
 * @param {number} perPage   - items per page (max 250)
 * @param {string} search    - search query (order name/number)
 * @param {string} status    - 'all' | 'open' | 'closed' | 'cancelled' | 'any'
 */
export async function getShopifyOrders({ page = 1, perPage = 10, search = '', status = 'all' } = {}) {
    // Shopify doesn't support offset-based pagination; we use a workaround
    // by fetching up to (page * perPage) and slicing, or searching by name.
    const params = {
        limit: Math.min(perPage, 250),
        status: status === 'all' ? 'any' : status,
        order: 'created_at desc',
    };

    // If searching, use the name parameter (Shopify order name/number search)
    if (search) {
        // Shopify allows searching by order name (e.g., #1001)
        params.name = search.startsWith('#') ? search : search;
    }

    // Get total count first
    const countParams = { status: params.status };
    const countData = await shopifyGet('/orders/count.json', countParams);
    const totalOrders = countData?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

    // For pagination, Shopify Admin REST API 2024-01 supports page-based
    // We fetch larger batches and slice for the correct page
    const fetchLimit = Math.min(page * perPage, 250);
    const data = await shopifyGet('/orders.json', {
        ...params,
        limit: fetchLimit,
    });

    let orders = (data?.orders || []).map(normalizeOrder);

    // Slice to the correct page window
    const startIdx = (page - 1) * perPage;
    orders = orders.slice(startIdx, startIdx + perPage);

    // Client-side filter by order name/number if search provided
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
        pagination: {
            page,
            perPage,
            totalOrders,
            totalPages,
        },
    };
}

// ─── Normalizer: convert Shopify order → unified internal schema ─────────────
function normalizeOrder(sOrder) {
    const customer = sOrder.customer || {};
    const billing = sOrder.billing_address || sOrder.shipping_address || {};
    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Guest';

    return {
        id: sOrder.id,
        number: sOrder.order_number || sOrder.name || sOrder.id,
        status: mapShopifyStatus(sOrder.financial_status, sOrder.fulfillment_status, sOrder.cancelled_at),
        date: sOrder.created_at,
        customerName,
        customerEmail: customer.email || sOrder.email || '',
        customerPhone: billing.phone || customer.phone || '',
        city: billing.city || '',
        total: parseFloat(sOrder.total_price || 0),
        currency: sOrder.currency || 'PKR',
        paymentMethod: sOrder.gateway || sOrder.payment_gateway_names?.[0] || '',
        itemCount: (sOrder.line_items || []).reduce((sum, item) => sum + (item.quantity || 1), 0),
        items: (sOrder.line_items || []).map(item => ({
            name: item.title || item.name || 'Item',
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0),
            subtotal: parseFloat(item.price || 0) * (item.quantity || 1),
            sku: item.sku || '',
            variant: item.variant_title || '',
        })),
    };
}

/**
 * Map Shopify financial_status + fulfillment_status to unified UI status
 */
function mapShopifyStatus(financialStatus, fulfillmentStatus, cancelledAt) {
    if (cancelledAt) return 'cancelled';

    const fStatus = (fulfillmentStatus || '').toLowerCase();
    if (fStatus === 'fulfilled') return 'delivered';
    if (fStatus === 'partial') return 'processing';

    const pStatus = (financialStatus || '').toLowerCase();
    if (pStatus === 'refunded' || pStatus === 'partially_refunded') return 'refunded';
    if (pStatus === 'voided') return 'cancelled';
    if (pStatus === 'paid') return 'processing';
    if (pStatus === 'pending' || pStatus === 'authorized') return 'pending';

    return 'pending';
}
