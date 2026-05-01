/**
 * PostEx Service
 * Handles integration with PostEx API for courier management
 */

const BASE_URL = 'https://api.postex.pk/services/integration/api';

/**
 * Helper to make requests to PostEx API
 */
async function postexRequest(endpoint, apiKey, params = {}, method = 'GET') {
    try {
        let url = `${BASE_URL}${endpoint}`;

        const options = {
            method,
            headers: {
                'token': apiKey,
                'Content-Type': 'application/json'
            }
        };

        if (params && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(params);
        } else if (params && method === 'GET') {
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => queryParams.append(key, params[key]));
            const queryString = queryParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        console.log(`Calling PostEx API: ${method} ${url}`);
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || (data.statusCode && data.statusCode !== "200")) {
            console.error("PostEx API Error Data:", data);
            throw new Error(data.statusMessage || `API Error: ${res.status}`);
        }

        return data;
    } catch (error) {
        console.error(`PostEx API Request Error (${endpoint}):`, error);
        throw error;
    }
}

export function isPostExConfigured(apiKey) {
    return !!apiKey;
}

/**
 * Fetch PostEx stats (Calculated from orders for now)
 */
export async function getPostExStats(apiKey) {
    if (!isPostExConfigured(apiKey)) {
        return { configured: false };
    }

    try {
        // Fetch orders for the last 30 days to calculate stats
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // yyyy-mm-dd as per PDF
        };

        const data = await postexRequest('/order/v1/get-all-order', apiKey, {
            orderStatusId: 0,
            startDate: formatDate(thirtyDaysAgo),
            endDate: formatDate(today)
        }, 'GET');

        const dist = data.dist || [];

        console.log('post ex response: ', data)

        // Calculate metrics
        let codPending = 0;
        let codRecovered = 0;
        let totalShipments = dist.length;
        let todayShipments = 0;

        const todayStr = formatDate(today);

        dist.forEach(item => {
            const o = item || {};
            const amount = parseFloat(o.invoicePayment) || 0;
            const status = (o.transactionStatus || '').toLowerCase();
            const orderDate = o.transactionDate; // Assuming YYYY-MM-DD

            if (status.includes('delivered')) {
                codRecovered += amount;
            } else if (
                status.includes('booked') ||
                status.includes('transit') ||
                status.includes('warehouse') ||
                status.includes('picked') ||
                status.includes('delivery')
            ) {
                codPending += amount;
            }

            if (orderDate && orderDate.includes(todayStr)) {
                todayShipments++;
            }
        });

        return {
            configured: true,
            todayShipments,
            totalShipments,
            codPending,
            codRecovered,
            currency: 'PKR',
            lastUpdated: new Date().toISOString()
        };
    } catch (e) {
        console.error("Failed to calculate PostEx stats:", e);
        return { configured: true, error: e.message };
    }
}

/**
 * Fetch paginated PostEx orders/shipments
 */
export async function getPostExOrders({ apiKey, page = 1, perPage = 10, status = 'any', search = '' } = {}) {
    if (!isPostExConfigured(apiKey)) {
        return { configured: false };
    }

    try {
        const today = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(today.getDate() - 60);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const data = await postexRequest('/order/v1/get-all-order', apiKey, {
            orderStatusID: 0,
            orderStatusId: 0,
            statusId: 0,
            fromDate: formatDate(sixtyDaysAgo),
            toDate: formatDate(today),
            startDate: formatDate(sixtyDaysAgo),
            endDate: formatDate(today)
        }, 'GET');

        // The API returns an array of items directly in dist
        let allOrders = (data.dist || []).map(item => normalizePostExOrder(item, item.trackingNumber));

        // Filter by status if not 'any'
        if (status !== 'any') {
            allOrders = allOrders.filter(o => o.status === status);
        }

        // Search
        if (search) {
            const s = search.toLowerCase();
            allOrders = allOrders.filter(o =>
                o.number.toLowerCase().includes(s) ||
                o.customerName.toLowerCase().includes(s)
            );
        }

        // Sort by date desc
        allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Manual pagination
        const totalOrders = allOrders.length;
        const totalPages = Math.ceil(totalOrders / perPage);
        const paginatedOrders = allOrders.slice((page - 1) * perPage, page * perPage);

        return {
            configured: true,
            orders: paginatedOrders,
            pagination: {
                page,
                perPage,
                totalOrders,
                totalPages
            }
        };
    } catch (e) {
        return { configured: true, error: e.message };
    }
}

/**
 * Maps PostEx specific statuses to common dashboard statuses
 * Based on Page 30 of Guide
 */
function mapPostExStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'completed';
    if (s.includes('transit') || s.includes('picked') || s.includes('delivery') || s.includes('warehouse')) return 'processing';
    if (s.includes('booked') || s.includes('pending') || s.includes('unbooked')) return 'pending';
    if (s.includes('returned') || s.includes('cancelled') || s.includes('expired')) return 'cancelled';
    if (s.includes('hold') || s.includes('review')) return 'on-hold';
    return 'pending';
}

/**
 * Normalizes raw PostEx API order to Zyro format
 */
function normalizePostExOrder(o, trackingNum) {
    if (!o) return {};
    const customerName = o.customerName || 'Walk-in Customer';
    return {
        id: o.orderRefNumber || trackingNum,
        number: trackingNum || o.trackingNumber,
        status: mapPostExStatus(o.transactionStatus),
        rawStatus: o.transactionStatus,
        date: o.transactionDate,
        customerName: customerName,
        customerEmail: o.deliveryAddress || '—', // Guide uses deliveryAddress for email? Wait, page 12 says deliveryAddress is email.
        customerPhone: o.customerPhone || '—',
        city: o.cityName || '—',
        address: {
            shipping: {
                first_name: customerName.split(' ')[0],
                last_name: customerName.split(' ').slice(1).join(' '),
                address1: o.deliveryAddress || '—',
                city: o.cityName || '—',
                country: 'Pakistan'
            },
            billing: {
                address1: o.deliveryAddress || '—',
                city: o.cityName || '—',
                country: 'Pakistan'
            }
        },
        total: parseFloat(o.invoicePayment) || 0,
        currency: 'PKR',
        paymentMethod: 'Cash on Delivery',
        itemCount: parseInt(o.items) || 1,
        items: [
            {
                name: o.orderDetail || 'Standard Parcel',
                quantity: parseInt(o.items) || 1,
                price: parseFloat(o.invoicePayment) || 0,
                subtotal: parseFloat(o.invoicePayment) || 0
            }
        ]
    };
}
