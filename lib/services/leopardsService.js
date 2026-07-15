/**
 * Leopards Courier Service
 * API: https://merchantapi.leopardscourier.com
 * Auth: api_key + api_password in request body (no header auth)
 * Test mode: pass enable_test_mode: "1" in body — no separate sandbox URL needed
 */

const BASE_URL = 'https://merchantapi.leopardscourier.com';

function baseBody(apiKey, apiPassword, testMode = false) {
    return {
        api_key: apiKey,
        api_password: apiPassword,
        enable_test_mode: testMode ? '1' : '0',
    };
}

async function leopardsRequest(path, apiKey, apiPassword, extra = {}, testMode = false) {
    const body = { ...baseBody(apiKey, apiPassword, testMode), ...extra };
    console.log(`[Leopards] POST ${BASE_URL}${path}`);
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Leopards API error ${res.status}`);
    return data;
}

export function isLeopardsConfigured(apiKey, apiPassword) {
    return !!(apiKey && apiPassword);
}

/**
 * Verify credentials by fetching cities — a lightweight authenticated call.
 * Returns { configured, connected, error? }
 */
export async function verifyLeopardsConnection(apiKey, apiPassword) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false, connected: false };
    try {
        const data = await leopardsRequest('/webservice/getAllCities/format/json/', apiKey, apiPassword);
        // Leopards returns status: 1 on success
        if (data.status === 1 || Array.isArray(data.city_list)) {
            return { configured: true, connected: true };
        }
        return { configured: true, connected: false, error: data.error || 'Invalid credentials' };
    } catch (e) {
        return { configured: true, connected: false, error: e.message };
    }
}

/**
 * Get all cities (for destination city ID lookup).
 * Results should be cached by the caller — this list rarely changes.
 */
export async function getLeopardsCities(apiKey, apiPassword) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        const data = await leopardsRequest('/webservice/getAllCities/format/json/', apiKey, apiPassword);
        return {
            configured: true,
            cities: data.city_list || [],
        };
    } catch (e) {
        return { configured: true, error: e.message, cities: [] };
    }
}

/**
 * Get Leopards stats — connection verified via city fetch, order KPIs from Supabase
 * (Leopards has no "list all orders" endpoint)
 */
export async function getLeopardsStats(apiKey, apiPassword) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        const conn = await verifyLeopardsConnection(apiKey, apiPassword);
        if (!conn.connected) return { configured: true, error: conn.error };
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
        console.error('[Leopards Stats Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Book a Leopards COD shipment
 * POST /webservice/bookPacket/format/json/
 */
export async function createLeopardsOrder(apiKey, apiPassword, orderData, testMode = false) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };

    try {
        let phone = orderData.customerPhone || '';
        if (phone.startsWith('92') && phone.length === 12) phone = '0' + phone.slice(2);
        else if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

        const payload = {
            booked_packet_weight:       String(orderData.weight ?? 0.5),
            booked_packet_vol_weight_w: String(orderData.width  ?? 10),
            booked_packet_vol_weight_h: String(orderData.height ?? 10),
            booked_packet_vol_weight_l: String(orderData.length ?? 10),
            booked_packet_no_piece:     String(orderData.items  ?? 1),
            booked_packet_collect_amount: String(orderData.invoicePayment),
            booked_packet_order_id:     orderData.orderRefNumber,
            origin_city:                orderData.originCityId  ?? 'self',
            destination_city:           String(orderData.destinationCityId ?? 'self'),
            shipment_name_eng:          orderData.customerName,
            shipment_email:             orderData.customerEmail  ?? '',
            shipment_phone:             phone,
            shipment_address:           orderData.deliveryAddress,
            shipment_type:              orderData.shipmentType   ?? 'overnight',
            special_instructions:       orderData.orderDetail    ?? '',
            shipment_content:           orderData.shipmentContent ?? 'Goods',
        };

        const data = await leopardsRequest(
            '/webservice/bookPacket/format/json/',
            apiKey, apiPassword, payload, testMode
        );

        if (data.status !== 1) {
            return { configured: true, success: false, error: data.error || 'Booking failed' };
        }

        return {
            configured: true,
            success: true,
            trackingNumber: data.packet_cn,
            orderRefNumber: orderData.orderRefNumber,
            raw: data,
        };
    } catch (e) {
        console.error('[Leopards createOrder Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

/**
 * Track a Leopards shipment
 * POST /webservice/trackBookedPacket/format/json/
 * track_numbers: comma-separated 10-digit tracking numbers
 */
export async function trackLeopardsPacket(apiKey, apiPassword, trackingNumber, testMode = false) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        const data = await leopardsRequest(
            '/webservice/trackBookedPacket/format/json/',
            apiKey, apiPassword,
            { track_numbers: trackingNumber },
            testMode
        );
        return { configured: true, ...data };
    } catch (e) {
        console.error('[Leopards Track Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Cancel a booked Leopards packet
 * POST /webservice/cancelBookedPackets/format/json
 */
export async function cancelLeopardsOrder(apiKey, apiPassword, trackingNumber, testMode = false) {
    if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };
    try {
        const data = await leopardsRequest(
            '/webservice/cancelBookedPackets/format/json',
            apiKey, apiPassword,
            { cancel_track_numbers: trackingNumber },
            testMode
        );
        return { configured: true, success: data.status === 1, raw: data };
    } catch (e) {
        console.error('[Leopards Cancel Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

export function mapLeopardsStatus(activityType) {
    if (!activityType) return 'pending';
    const s = activityType.toLowerCase();
    if (s.includes('delivered'))                                   return 'completed';
    if (s.includes('returned') || s.includes('rto') || s.includes('cancel')) return 'cancelled';
    if (s.includes('hold'))                                        return 'on-hold';
    if (s.includes('transit') || s.includes('picked') || s.includes('out for delivery') || s.includes('dispatch')) return 'processing';
    return 'pending';
}

export function normalizeLeopardsOrder(o) {
    if (!o) return {};
    const customerName = o.shipment_name_eng || o.customerName || 'Unknown';
    return {
        id:            o.booked_packet_order_id || o.packet_cn,
        number:        o.packet_cn || o.tracking_number,
        status:        mapLeopardsStatus(o.activity_type || o.status),
        rawStatus:     o.activity_type || o.status || '—',
        date:          o.booked_packet_added_date || o.createdAt || o.created_at,
        customerName,
        customerPhone: o.shipment_phone || '—',
        city:          o.shipment_destination_city || '—',
        address: {
            shipping: {
                first_name: customerName.split(' ')[0],
                last_name:  customerName.split(' ').slice(1).join(' '),
                address1:   o.shipment_address || '—',
                city:       o.shipment_destination_city || '—',
                country:    'Pakistan',
            },
            billing: {
                address1: o.shipment_address || '—',
                city:     o.shipment_destination_city || '—',
                country:  'Pakistan',
            },
        },
        total:         parseFloat(o.booked_packet_collect_amount || o.total_amount) || 0,
        currency:      'PKR',
        paymentMethod: 'Cash on Delivery',
        itemCount:     parseInt(o.booked_packet_no_piece) || 1,
        items: [{
            name:     o.shipment_content || o.special_instructions || 'Standard Parcel',
            quantity: parseInt(o.booked_packet_no_piece) || 1,
            price:    parseFloat(o.booked_packet_collect_amount || o.total_amount) || 0,
            subtotal: parseFloat(o.booked_packet_collect_amount || o.total_amount) || 0,
        }],
    };
}
