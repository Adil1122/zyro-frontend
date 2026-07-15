/**
 * M&P Courier (Moveandpick) Service
 * API: https://gfs.moveandpick.com
 * Auth: username + password in request body
 * Docs supplied by M&P on merchant account approval
 */

const BASE_URL = 'https://gfs.moveandpick.com';

async function mpRequest(path, username, password, extra = {}) {
    const body = { username, password, ...extra };
    console.log(`[M&P] POST ${BASE_URL}${path}`);
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `M&P API error ${res.status}`);
    return data;
}

export function isMPConfigured(username, password) {
    return !!(username && password);
}

export async function verifyMPConnection(username, password) {
    if (!isMPConfigured(username, password)) return { configured: false, connected: false };
    try {
        // Lightweight auth test — rate enquiry with minimal payload
        const data = await mpRequest('/api/getrates', username, password, {
            origin_city: 'Karachi',
            destination_city: 'Lahore',
            weight: '0.5',
        });
        if (data.status === true || data.rates || data.success) {
            return { configured: true, connected: true };
        }
        return { configured: true, connected: false, error: data.message || 'Invalid credentials' };
    } catch (e) {
        return { configured: true, connected: false, error: e.message };
    }
}

export async function getMPStats(username, password) {
    if (!isMPConfigured(username, password)) return { configured: false };
    try {
        const conn = await verifyMPConnection(username, password);
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
        console.error('[M&P Stats Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Book an M&P COD shipment
 * POST /api/booking
 */
export async function createMPOrder(username, password, orderData) {
    if (!isMPConfigured(username, password)) return { configured: false };

    try {
        let phone = orderData.customerPhone || '';
        if (phone.startsWith('92') && phone.length === 12) phone = '0' + phone.slice(2);
        else if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

        const payload = {
            consignee_name:     orderData.customerName,
            consignee_address:  orderData.deliveryAddress,
            consignee_city:     orderData.cityName,
            consignee_phone:    phone,
            consignee_email:    orderData.customerEmail || '',
            order_id:           orderData.orderRefNumber,
            cod_amount:         String(orderData.invoicePayment),
            weight:             String(orderData.weight ?? 0.5),
            pieces:             String(orderData.items ?? 1),
            remarks:            orderData.orderDetail || '',
            service_type:       orderData.serviceType || 'overnight',
        };

        const data = await mpRequest('/api/booking', username, password, payload);

        if (!data.success && !data.cn_number && !data.tracking_number) {
            return { configured: true, success: false, error: data.message || 'Booking failed' };
        }

        return {
            configured: true,
            success: true,
            trackingNumber: data.cn_number || data.tracking_number || data.awb,
            orderRefNumber: orderData.orderRefNumber,
            raw: data,
        };
    } catch (e) {
        console.error('[M&P createOrder Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

/**
 * Track an M&P shipment by AWB
 * POST /api/tracking
 */
export async function trackMPShipment(username, password, awb) {
    if (!isMPConfigured(username, password)) return { configured: false };
    try {
        const data = await mpRequest('/api/tracking', username, password, { awb });
        return { configured: true, ...data };
    } catch (e) {
        console.error('[M&P Track Error]', e.message);
        return { configured: true, error: e.message };
    }
}

export function mapMPStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'completed';
    if (s.includes('returned') || s.includes('rto') || s.includes('cancel')) return 'cancelled';
    if (s.includes('hold')) return 'on-hold';
    if (s.includes('transit') || s.includes('picked') || s.includes('out for delivery') || s.includes('dispatch') || s.includes('in progress')) return 'processing';
    return 'pending';
}

export function normalizeMPOrder(o) {
    if (!o) return {};
    const customerName = o.consignee_name || o.customerName || 'Unknown';
    return {
        id:            o.order_id || o.cn_number,
        number:        o.cn_number || o.tracking_number || o.awb || o.order_id,
        status:        mapMPStatus(o.status),
        rawStatus:     o.status || '—',
        date:          o.booking_date || o.createdAt || o.created_at,
        customerName,
        customerPhone: o.consignee_phone || '—',
        city:          o.consignee_city || '—',
        address: {
            shipping: {
                first_name: customerName.split(' ')[0],
                last_name:  customerName.split(' ').slice(1).join(' '),
                address1:   o.consignee_address || '—',
                city:       o.consignee_city || '—',
                country:    'Pakistan',
            },
            billing: {
                address1: o.consignee_address || '—',
                city:     o.consignee_city || '—',
                country:  'Pakistan',
            },
        },
        total:         parseFloat(o.cod_amount || o.total_amount) || 0,
        currency:      'PKR',
        paymentMethod: 'Cash on Delivery',
        itemCount:     parseInt(o.pieces) || 1,
        items: [{
            name:     o.remarks || 'Standard Parcel',
            quantity: parseInt(o.pieces) || 1,
            price:    parseFloat(o.cod_amount || o.total_amount) || 0,
            subtotal: parseFloat(o.cod_amount || o.total_amount) || 0,
        }],
    };
}
