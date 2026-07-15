/**
 * TCS Courier Service
 * Handles integration with TCS COD API
 * Dev:  https://devconnect.tcscourier.com
 * Prod: https://ociconnect.tcscourier.com
 */

const BASE_URL =
    process.env.NODE_ENV === 'production'
        ? 'https://ociconnect.tcscourier.com'
        : 'https://devconnect.tcscourier.com';

// In-memory token cache keyed by "apiKey:apiPassword"
const _tokenCache = {};

async function getTCSToken(apiKey, apiPassword) {
    const cacheKey = `${apiKey}:${apiPassword}`;
    const cached = _tokenCache[cacheKey];
    if (cached && Date.now() < cached.expiresAt) return cached.token;

    const res = await fetch(`${BASE_URL}/auth/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: apiKey, password: apiPassword }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
        throw new Error(data.message || 'TCS authentication failed. Check API Key and Password.');
    }

    _tokenCache[cacheKey] = {
        token: data.token,
        expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
    };
    return data.token;
}

async function tcsRequest(endpoint, token, params = {}, method = 'GET', body = null) {
    let url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    };
    if (method === 'GET' && Object.keys(params).length) {
        url += '?' + new URLSearchParams(params).toString();
    }
    if (body) options.body = JSON.stringify(body);

    console.log(`[TCS] ${method} ${url}`);
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.detail || `TCS API error ${res.status}`);
    return data;
}

export function isTCSConfigured(apiKey, apiPassword) {
    return !!(apiKey && apiPassword);
}

/**
 * Verify credentials by authenticating — returns { configured, connected, error? }
 */
export async function verifyTCSConnection(apiKey, apiPassword) {
    if (!isTCSConfigured(apiKey, apiPassword)) return { configured: false, connected: false };
    try {
        await getTCSToken(apiKey, apiPassword);
        return { configured: true, connected: true };
    } catch (e) {
        return { configured: true, connected: false, error: e.message };
    }
}

/**
 * Get TCS stats — connection verified via auth, order KPIs come from Supabase
 * (TCS has no "list all orders" endpoint, so stats are derived from locally synced data)
 */
export async function getTCSStats(apiKey, apiPassword) {
    if (!isTCSConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        await getTCSToken(apiKey, apiPassword);
        return {
            configured: true,
            todayShipments: 0,
            totalShipments: 0,
            codPending: 0,
            codRecovered: 0,
            currency: 'PKR',
            lastUpdated: new Date().toISOString(),
        };
    } catch (e) {
        console.error('[TCS Stats Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Create a TCS COD shipment
 * POST /ecom/api/booking/create
 */
export async function createTCSOrder(apiKey, apiPassword, costCentreCode, orderData) {
    if (!isTCSConfigured(apiKey, apiPassword)) return { configured: false };

    try {
        let phone = orderData.customerPhone || '';
        if (phone.startsWith('92') && phone.length === 12) phone = '0' + phone.slice(2);
        else if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

        const token = await getTCSToken(apiKey, apiPassword);

        const payload = {
            CostCentreCode: costCentreCode,
            ConsigneeName: orderData.customerName,
            ConsigneeAddress: orderData.deliveryAddress,
            ConsigneeCity: orderData.cityName,
            ConsigneeMobile: phone,
            ConsigneeEmail: orderData.customerEmail || '',
            ServiceTypeCode: orderData.serviceType || 'OVERNIGHT',
            PiecesCount: Number(orderData.items || 1),
            Weight: Number(orderData.weight || 0.5),
            CODAmount: Number(orderData.invoicePayment),
            OrderID: orderData.orderRefNumber,
            Remarks: orderData.orderDetail || '',
        };

        const data = await tcsRequest('/ecom/api/booking/create', token, {}, 'POST', payload);

        return {
            configured: true,
            success: true,
            trackingNumber: data.ConsignmentNo || data.consignmentNo || data.CN || null,
            orderRefNumber: orderData.orderRefNumber,
            raw: data,
        };
    } catch (e) {
        console.error('[TCS createOrder Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

/**
 * Track a TCS shipment by consignment number
 * GET /ecom/api/Payment/status
 */
export async function trackTCSShipment(apiKey, apiPassword, costCentreCode, consignmentNo) {
    if (!isTCSConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        const token = await getTCSToken(apiKey, apiPassword);
        const data = await tcsRequest('/ecom/api/Payment/status', token, {
            customerno: costCentreCode,
            consignmentno: consignmentNo,
        });
        return { configured: true, ...data };
    } catch (e) {
        console.error('[TCS Track Error]', e.message);
        return { configured: true, error: e.message };
    }
}

export function mapTCSStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'completed';
    if (s.includes('returned') || s.includes('cancelled') || s.includes('rto') || s.includes('expired')) return 'cancelled';
    if (s.includes('hold')) return 'on-hold';
    if (s.includes('transit') || s.includes('picked') || s.includes('out for delivery') || s.includes('dispatch')) return 'processing';
    return 'pending';
}

export function normalizeTCSOrder(o) {
    if (!o) return {};
    const customerName = o.ConsigneeName || o.customerName || 'Unknown';
    return {
        id: o.OrderID || o.ConsignmentNo,
        number: o.ConsignmentNo || o.trackingNumber || o.OrderID,
        status: mapTCSStatus(o.CNStatus || o.status),
        rawStatus: o.CNStatus || o.status || '—',
        date: o.BookingDate || o.createdAt || o.created_at,
        customerName,
        customerPhone: o.ConsigneeMobile || '—',
        city: o.ConsigneeCity || '—',
        address: {
            shipping: {
                first_name: customerName.split(' ')[0],
                last_name: customerName.split(' ').slice(1).join(' '),
                address1: o.ConsigneeAddress || '—',
                city: o.ConsigneeCity || '—',
                country: 'Pakistan',
            },
            billing: {
                address1: o.ConsigneeAddress || '—',
                city: o.ConsigneeCity || '—',
                country: 'Pakistan',
            },
        },
        total: parseFloat(o.CODAmount || o.total_amount) || 0,
        currency: 'PKR',
        paymentMethod: 'Cash on Delivery',
        itemCount: parseInt(o.PiecesCount) || 1,
        items: [{
            name: o.Remarks || o.orderDetail || 'Standard Parcel',
            quantity: parseInt(o.PiecesCount) || 1,
            price: parseFloat(o.CODAmount || o.total_amount) || 0,
            subtotal: parseFloat(o.CODAmount || o.total_amount) || 0,
        }],
    };
}
