import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

/**
 * WooCommerce Service — NestJS-style singleton service
 * Reads credentials from server-only environment variables (never exposed to browser)
 * 
 * ENV VARS required in .env.local:
 *   WC_STORE_URL        — e.g. https://my-store.com
 *   WC_CONSUMER_KEY     — ck_...
 *   WC_CONSUMER_SECRET  — cs_...
 */

function getClient(creds) {
    const { url, key, secret } = creds || {};

    if (!url || !key || !secret) {
        return null; // Not configured
    }

    return new WooCommerceRestApi({
        url,
        consumerKey: key,
        consumerSecret: secret,
        version: 'wc/v3',
        queryStringAuth: true, // Needed if store is on HTTPS
    });
}

/**
 * Check if WooCommerce credentials are provided
 */
export function isWooCommerceConfigured(creds) {
    return !!(creds?.url && creds?.key && creds?.secret);
}

/**
 * Fetch live stats: total orders, total revenue (all-time), today's orders & revenue
 */
export async function getWooCommerceStats(creds) {
    const api = getClient(creds);
    if (!api) throw new Error('WooCommerce is not configured for this user.');

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();

    // Fetch total report (all time)
    const [totalReportRes, todayReportRes] = await Promise.all([
        api.get('reports/sales', { period: 'year', date_min: '2020-01-01' }),
        api.get('reports/sales', {
            date_min: todayStart.toISOString().split('T')[0],
            date_max: todayEnd.toISOString().split('T')[0],
        }),
    ]);

    const totalReport = totalReportRes.data[0] || {};
    const todayReport = todayReportRes.data[0] || {};

    return {
        totalOrders: totalReport.total_orders ?? 0,
        totalRevenue: parseFloat(totalReport.total_sales ?? 0),
        todayOrders: todayReport.total_orders ?? 0,
        todayRevenue: parseFloat(todayReport.total_sales ?? 0),
        currency: totalReport.currency ?? 'PKR',
    };
}

/**
 * Fetch paginated orders list
 * @param {number} page - 1-based page number
 * @param {number} perPage - items per page
 * @param {string} search - search query (order ID or billing_email)
 * @param {string} status - order status filter ('any', 'pending', 'processing', 'completed', etc.)
 */
export async function getWooCommerceOrders({ creds, page = 1, perPage = 10, search = '', status = 'any' } = {}) {
    const api = getClient(creds);
    if (!api) throw new Error('WooCommerce is not configured for this user.');

    const params = {
        page,
        per_page: perPage,
        orderby: 'date',
        order: 'desc',
        status: status === 'all' ? 'any' : status,
    };

    if (search) {
        params.search = search;
    }

    const response = await api.get('orders', params);

    const totalOrders = parseInt(response.headers['x-wp-total'] ?? '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] ?? '1', 10);

    const orders = (response.data || []).map(normalizeOrder);

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

/**
 * Normalize a WooCommerce order to a unified internal schema
 */
function normalizeOrder(wcOrder) {
    const billing = wcOrder.billing || {};
    const shipping = wcOrder.shipping || {};
    const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest';

    return {
        id: wcOrder.id,
        number: wcOrder.number,
        status: wcOrder.status,
        date: wcOrder.date_created,
        customerName,
        customerEmail: billing.email || '',
        customerPhone: billing.phone || '',
        city: billing.city || '',
        address: {
            billing: {
                address1: billing.address_1 || '',
                address2: billing.address_2 || '',
                city: billing.city || '',
                state: billing.state || '',
                postcode: billing.postcode || '',
                country: billing.country || '',
            },
            shipping: {
                first_name: shipping.first_name || '',
                last_name: shipping.last_name || '',
                address1: shipping.address_1 || '',
                address2: shipping.address_2 || '',
                city: shipping.city || '',
                state: shipping.state || '',
                postcode: shipping.postcode || '',
                country: shipping.country || '',
            }
        },
        total: parseFloat(wcOrder.total || 0),
        currency: wcOrder.currency || 'PKR',
        paymentMethod: wcOrder.payment_method_title || '',
        itemCount: (wcOrder.line_items || []).length,
        items: (wcOrder.line_items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price || 0),
            subtotal: parseFloat(item.subtotal || 0),
            sku: item.sku || '',
        })),
    };
}

/**
 * Fetch paginated customers list
 */
export async function getWooCommerceCustomers({ creds, page = 1, perPage = 10, search = '' } = {}) {
    const api = getClient(creds);
    if (!api) throw new Error('WooCommerce is not configured for this user.');

    const params = {
        page,
        per_page: perPage,
        role: 'all',
    };

    if (search) {
        params.search = search;
    }

    const response = await api.get('customers', params);

    const totalCustomers = parseInt(response.headers['x-wp-total'] ?? '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] ?? '1', 10);

    const data = (response.data || []).map(c => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'N/A',
        email: c.email || 'N/A',
        phone: c.billing?.phone || 'N/A',
        city: c.billing?.city || 'N/A',
        ordersCount: c.orders_count || 0,
        totalSpent: parseFloat(c.total_spent || 0)
    }));

    return {
        data,
        meta: {
            pagination: {
                total: totalCustomers,
                page,
                pageSize: perPage,
                lastPage: totalPages,
            }
        },
    };
}

/**
 * Fetch paginated products (inventory) list
 */
export async function getWooCommerceProducts({ creds, page = 1, perPage = 10, search = '' } = {}) {
    const api = getClient(creds);
    if (!api) throw new Error('WooCommerce is not configured for this user.');

    const params = {
        page,
        per_page: perPage,
    };

    if (search) {
        params.search = search;
    }

    const response = await api.get('products', params);

    const totalProducts = parseInt(response.headers['x-wp-total'] ?? '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] ?? '1', 10);

    const data = (response.data || []).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        stock: p.stock_quantity ?? 0,
        price: parseFloat(p.price || 0),
        status: p.stock_status === 'instock' ? 'In Stock' : 'Out of Stock',
        category: (p.categories || []).map(cat => cat.name).join(', ') || 'Uncategorized'
    }));

    return {
        data,
        meta: {
            pagination: {
                total: totalProducts,
                page,
                pageSize: perPage,
                lastPage: totalPages,
            }
        },
    };
}

/**
 * Fetch paginated coupons (marketing) list
 */
export async function getWooCommerceCoupons({ creds, page = 1, perPage = 10 } = {}) {
    const api = getClient(creds);
    if (!api) throw new Error('WooCommerce is not configured for this user.');

    const params = {
        page,
        per_page: perPage,
    };

    const response = await api.get('coupons', params);

    const totalCoupons = parseInt(response.headers['x-wp-total'] ?? '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] ?? '1', 10);

    const data = (response.data || []).map(c => ({
        id: c.id,
        name: c.code || 'Unnamed Coupon',
        status: 'Active',
        budget: parseFloat(c.amount || '0'),
        type: c.discount_type,
        expiry: c.date_expires || 'No Expiry'
    }));

    return {
        data,
        meta: {
            pagination: {
                total: totalCoupons,
                page,
                pageSize: perPage,
                lastPage: totalPages,
            }
        },
    };
}
