/**
 * TrackingMore Service — used as Pakistan Post tracking proxy
 * API: https://api.trackingmore.com/v4
 * Auth: Tracking-Api-Key header
 * Free tier: 100 trackings/month; paid from $9/month
 */

const BASE_URL = 'https://api.trackingmore.com/v4';

async function tmRequest(path, apiKey, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Tracking-Api-Key': apiKey,
        },
    };
    if (body) options.body = JSON.stringify(body);
    console.log(`[TrackingMore] ${method} ${BASE_URL}${path}`);
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.meta?.message || `TrackingMore error ${res.status}`);
    return data;
}

export function isTrackingMoreConfigured(apiKey) {
    return !!apiKey;
}

export async function verifyTrackingMoreConnection(apiKey) {
    if (!isTrackingMoreConfigured(apiKey)) return { configured: false, connected: false };
    try {
        // GET /couriers returns courier list — lightweight auth test
        const data = await tmRequest('/couriers', apiKey);
        if (data.meta?.code === 200 || Array.isArray(data.data)) {
            return { configured: true, connected: true };
        }
        return { configured: true, connected: false, error: data.meta?.message || 'Invalid API key' };
    } catch (e) {
        return { configured: true, connected: false, error: e.message };
    }
}

export async function getTrackingMoreStats(apiKey) {
    if (!isTrackingMoreConfigured(apiKey)) return { configured: false };
    try {
        const conn = await verifyTrackingMoreConnection(apiKey);
        if (!conn.connected) return { configured: true, error: conn.error };

        const data = await tmRequest('/trackings?limit=40&courier_code=pakistan-post', apiKey);
        const trackings = data.data || [];

        let delivered = 0, inTransit = 0, pending = 0;
        trackings.forEach(t => {
            const s = (t.status || '').toLowerCase();
            if (s === 'delivered') delivered++;
            else if (s === 'in_transit') inTransit++;
            else pending++;
        });

        return {
            configured: true,
            totalTrackings: trackings.length,
            delivered,
            inTransit,
            pending,
            lastUpdated: new Date().toISOString(),
        };
    } catch (e) {
        console.error('[TrackingMore Stats Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Add a tracking number to monitor
 * POST /trackings
 */
export async function addTracking(apiKey, trackingNumber, courierCode = 'pakistan-post', extra = {}) {
    if (!isTrackingMoreConfigured(apiKey)) return { configured: false };
    try {
        const data = await tmRequest('/trackings', apiKey, 'POST', {
            tracking_number: trackingNumber,
            courier_code: courierCode,
            ...extra,
        });
        return { configured: true, success: true, tracking: data.data };
    } catch (e) {
        console.error('[TrackingMore addTracking Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

/**
 * Get all tracked shipments
 * GET /trackings
 */
export async function getTrackings(apiKey, { page = 1, limit = 20, courierCode = 'pakistan-post', status = '' } = {}) {
    if (!isTrackingMoreConfigured(apiKey)) return { configured: false };
    try {
        let qs = `?limit=${limit}&page=${page}`;
        if (courierCode) qs += `&courier_code=${courierCode}`;
        if (status && status !== 'any') qs += `&status=${status}`;
        const data = await tmRequest(`/trackings${qs}`, apiKey);
        const trackings = (data.data || []).map(normalizeTracking);
        return {
            configured: true,
            trackings,
            pagination: {
                page,
                perPage: limit,
                totalOrders: data.meta?.pagination?.total || trackings.length,
                totalPages: data.meta?.pagination?.total_pages || 1,
            },
        };
    } catch (e) {
        console.error('[TrackingMore getTrackings Error]', e.message);
        return { configured: true, error: e.message, trackings: [], pagination: { page: 1, perPage: 20, totalOrders: 0, totalPages: 1 } };
    }
}

export function mapTrackingStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s === 'delivered') return 'completed';
    if (s === 'undelivered' || s === 'exception' || s === 'expired') return 'cancelled';
    if (s === 'in_transit' || s === 'out_for_delivery') return 'processing';
    if (s === 'info_received' || s === 'pending') return 'pending';
    return 'pending';
}

export function normalizeTracking(t) {
    if (!t) return {};
    return {
        id:            t.id || t.tracking_number,
        number:        t.tracking_number,
        status:        mapTrackingStatus(t.status),
        rawStatus:     t.status || '—',
        date:          t.created_at,
        customerName:  t.customer_name || '—',
        customerPhone: t.customer_phone || '—',
        city:          t.destination_country || 'Pakistan',
        address: {
            shipping: { address1: t.destination_country || 'Pakistan', city: 'Pakistan', country: 'Pakistan' },
            billing:  { address1: 'Pakistan', city: 'Pakistan', country: 'Pakistan' },
        },
        total:         0,
        currency:      'PKR',
        paymentMethod: '—',
        itemCount:     1,
        items:         [{ name: 'Postal Package', quantity: 1, price: 0, subtotal: 0 }],
        latestEvent:   t.latest_event || '',
    };
}
