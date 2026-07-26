/**
 * Shopify Admin API Service
 * Credentials stored per-user in Supabase (shopify_store_domain, shopify_access_token).
 * API Docs: https://shopify.dev/docs/api/admin-rest
 */

const API_VERSION = '2026-07';

function getBaseUrl(domain) {
    if (!domain) return null;
    const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${clean}/admin/api/${API_VERSION}`;
}

function getHeaders(accessToken) {
    return {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
    };
}

async function shopifyGet(endpoint, params = {}, creds) {
    const base = getBaseUrl(creds?.domain);
    if (!base) throw new Error('Shopify is not configured');

    const qs = new URLSearchParams(params).toString();
    const url = `${base}${endpoint}${qs ? '?' + qs : ''}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(creds?.accessToken),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error ${res.status}: ${body}`);
    }

    return res.json();
}

export function isShopifyConfigured(creds) {
    return !!(
        creds?.domain &&
        creds?.accessToken &&
        !creds.domain.includes('your-shopify') &&
        !creds.accessToken.includes('shpat_xxxx')
    );
}

export async function getShopifyStats(creds) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const countData = await shopifyGet('/orders/count.json', { status: 'any' }, creds);
    const totalOrders = countData?.count ?? 0;

    const todayCountData = await shopifyGet('/orders/count.json', {
        status: 'any',
        created_at_min: todayStart.toISOString(),
    }, creds);
    const todayOrders = todayCountData?.count ?? 0;

    const [allOrdersData, todayOrdersData] = await Promise.all([
        shopifyGet('/orders.json', {
            status: 'any',
            fields: 'id,total_price,currency',
            limit: 250,
        }, creds),
        shopifyGet('/orders.json', {
            status: 'any',
            created_at_min: todayStart.toISOString(),
            fields: 'id,total_price,currency',
            limit: 250,
        }, creds),
    ]);

    const allOrders = allOrdersData?.orders || [];
    const todayOrdersList = todayOrdersData?.orders || [];

    const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const todayRevenue = todayOrdersList.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const currency = allOrders[0]?.currency || todayOrdersList[0]?.currency || 'PKR';

    return { totalOrders, totalRevenue, todayOrders, todayRevenue, currency };
}

export async function getShopifyOrders({ page = 1, perPage = 10, search = '', status = 'all', creds } = {}) {
    const params = {
        limit: Math.min(perPage, 250),
        status: status === 'all' ? 'any' : status,
        order: 'created_at desc',
    };

    if (search) params.name = search;

    const countParams = { status: params.status };
    const countData = await shopifyGet('/orders/count.json', countParams, creds);
    const totalOrders = countData?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

    const fetchLimit = Math.min(page * perPage, 250);
    const data = await shopifyGet('/orders.json', { ...params, limit: fetchLimit }, creds);

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

    return { orders, pagination: { page, perPage, totalOrders, totalPages } };
}

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

function mapShopifyStatus(financialStatus, fulfillmentStatus, cancelledAt) {
    if (cancelledAt) return 'cancelled';
    const fStatus = (fulfillmentStatus || '').toLowerCase();
    if (fStatus === 'fulfilled') return 'delivered';
    if (fStatus === 'partial') return 'processing';
    const pStatus = (financialStatus || '').toLowerCase();
    if (pStatus === 'refunded' || pStatus === 'partially_refunded') return 'refunded';
    if (pStatus === 'voided') return 'cancelled';
    if (pStatus === 'paid') return 'processing';
    return 'pending';
}
