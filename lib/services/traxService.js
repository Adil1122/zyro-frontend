/**
 * Trax Pakistan Courier Service
 * API Base: https://sonic.pk (Trax backend — formerly Sonic Logistics)
 * Auth: api_key + api_secret → Bearer token
 */

const BASE_URL = 'https://sonic.pk';

const _tokenCache = {};

async function getTraxToken(apiKey, apiSecret) {
    const cacheKey = `${apiKey}:${apiSecret}`;
    const cached = _tokenCache[cacheKey];
    if (cached && Date.now() < cached.expiresAt) return cached.token;

    const res = await fetch(`${BASE_URL}/api/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
        throw new Error(data.message || 'Trax authentication failed. Check API Key and Secret.');
    }

    _tokenCache[cacheKey] = {
        token: data.token,
        expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
    };
    return data.token;
}

async function traxRequest(endpoint, apiKey, apiSecret, body = null, method = 'POST') {
    const token = await getTraxToken(apiKey, apiSecret);
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    };
    if (body) options.body = JSON.stringify(body);

    console.log(`[Trax] ${method} ${url}`);
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Trax API error ${res.status}`);
    return data;
}

export function isTraxConfigured(apiKey, apiSecret) {
    return !!(apiKey && apiSecret);
}

export async function verifyTraxConnection(apiKey, apiSecret) {
    if (!isTraxConfigured(apiKey, apiSecret)) return { configured: false, connected: false };
    try {
        await getTraxToken(apiKey, apiSecret);
        return { configured: true, connected: true };
    } catch (e) {
        return { configured: true, connected: false, error: e.message };
    }
}

export async function createTraxOrder(apiKey, apiSecret, orderData) {
    if (!isTraxConfigured(apiKey, apiSecret)) return { configured: false };

    try {
        let phone = orderData.customerPhone || '';
        if (phone.startsWith('92') && phone.length === 12) phone = '0' + phone.slice(2);
        else if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

        const payload = {
            service:  'ECOM',
            consignee_name: orderData.customerName,
            consignee_address: orderData.deliveryAddress,
            consignee_city: orderData.cityName,
            consignee_phone: phone,
            consignee_email: orderData.customerEmail || '',
            order_id: orderData.orderRefNumber,
            cod_amount: Number(orderData.invoicePayment),
            pieces: Number(orderData.items || 1),
            weight: Number(orderData.weight || 0.5),
            remarks: orderData.orderDetail || '',
        };

        const data = await traxRequest('/api/v2/book', apiKey, apiSecret, payload, 'POST');

        return {
            configured: true,
            success: true,
            trackingNumber: data.cn || data.tracking_number || data.consignment_no || null,
            orderRefNumber: orderData.orderRefNumber,
            raw: data,
        };
    } catch (e) {
        console.error('[Trax createOrder Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

export async function trackTraxShipment(apiKey, apiSecret, cn) {
    if (!isTraxConfigured(apiKey, apiSecret)) return { configured: false };

    try {
        const data = await traxRequest(`/api/v2/track?cn=${encodeURIComponent(cn)}`, apiKey, apiSecret, null, 'GET');
        return {
            configured: true,
            cn,
            status: data.status || 'Unknown',
            detail: data.detail || data.message || null,
            events: Array.isArray(data.events) ? data.events : [],
            raw: data,
        };
    } catch (e) {
        console.error('[Trax track Error]', e.message);
        return { configured: true, error: e.message };
    }
}
