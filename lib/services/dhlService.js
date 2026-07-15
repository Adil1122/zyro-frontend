/**
 * DHL Express MyDHL API Service
 * Prod:  https://api.dhl.com/mydhlapi
 * Test:  https://api-mock.dhl.com/mydhlapi
 * Auth:  HTTP Basic Auth — Authorization: Basic base64(apiKey:apiSecret)
 */

const BASE_URL =
    process.env.NODE_ENV === 'production'
        ? 'https://api.dhl.com/mydhlapi'
        : 'https://api-mock.dhl.com/mydhlapi';

function basicAuth(apiKey, apiSecret) {
    return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

async function dhlRequest(path, apiKey, apiSecret, params = {}, method = 'GET', body = null) {
    let url = `${BASE_URL}${path}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: basicAuth(apiKey, apiSecret),
        },
    };
    if (method === 'GET' && Object.keys(params).length) {
        url += '?' + new URLSearchParams(params).toString();
    }
    if (body) options.body = JSON.stringify(body);

    console.log(`[DHL] ${method} ${url}`);
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.title || `DHL API error ${res.status}`);
    return data;
}

export function isDHLConfigured(apiKey, apiSecret, accountNumber) {
    return !!(apiKey && apiSecret && accountNumber);
}

export async function verifyDHLConnection(apiKey, apiSecret, accountNumber) {
    if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false, connected: false };
    try {
        // GET /address-validate — lightweight auth test
        const data = await dhlRequest('/address-validate', apiKey, apiSecret, {
            type: 'delivery',
            countryCode: 'PK',
            cityName: 'Karachi',
        });
        return { configured: true, connected: true };
    } catch (e) {
        // 400/422 still means auth worked; 401 means bad credentials
        if (e.message.includes('401') || e.message.toLowerCase().includes('unauthorized')) {
            return { configured: true, connected: false, error: 'Invalid API credentials' };
        }
        return { configured: true, connected: true }; // other errors = auth ok
    }
}

export async function getDHLStats(apiKey, apiSecret, accountNumber) {
    if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false };
    try {
        const conn = await verifyDHLConnection(apiKey, apiSecret, accountNumber);
        if (!conn.connected) return { configured: true, error: conn.error };
        return {
            configured: true,
            todayShipments: 0,
            totalShipments: 0,
            lastUpdated: new Date().toISOString(),
        };
    } catch (e) {
        console.error('[DHL Stats Error]', e.message);
        return { configured: true, error: e.message };
    }
}

/**
 * Get rate quote
 * GET /rates
 */
export async function getDHLRates(apiKey, apiSecret, accountNumber, params) {
    if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false };
    try {
        const data = await dhlRequest('/rates', apiKey, apiSecret, {
            accountNumber,
            originCountryCode: params.originCountry || 'PK',
            originCityName:    params.originCity || 'Karachi',
            destinationCountryCode: params.destCountry || 'PK',
            destinationCityName:    params.destCity,
            weight:            params.weight || 0.5,
            length:            params.length || 20,
            width:             params.width || 15,
            height:            params.height || 10,
            plannedShippingDate: new Date().toISOString().slice(0, 10),
            isCustomsDeclarable: false,
            unitOfMeasurement: 'metric',
        });
        return { configured: true, products: data.products || [] };
    } catch (e) {
        return { configured: true, error: e.message, products: [] };
    }
}

/**
 * Create DHL Express shipment
 * POST /shipments
 */
export async function createDHLShipment(apiKey, apiSecret, accountNumber, orderData) {
    if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false };

    try {
        let phone = orderData.customerPhone || '';
        if (phone.startsWith('92') && phone.length === 12) phone = '+' + phone;
        else if (phone.startsWith('0')) phone = '+92' + phone.slice(1);

        const plannedDate = new Date().toISOString().slice(0, 10);

        const payload = {
            plannedShippingDateAndTime: `${plannedDate}T09:00:00 GMT+05:00`,
            pickup: { isRequested: false },
            productCode: orderData.productCode || 'N',
            accounts: [{ typeCode: 'shipper', number: accountNumber }],
            shipper: {
                name: orderData.shipperName || 'Zyro Commerce',
                phone: orderData.shipperPhone || phone,
                email: orderData.shipperEmail || '',
                address: {
                    addressLine1: orderData.shipperAddress || 'Karachi, Pakistan',
                    cityName:     orderData.shipperCity || 'Karachi',
                    countryCode:  'PK',
                    postalCode:   orderData.shipperPostal || '75600',
                },
            },
            consignee: {
                name:  orderData.customerName,
                phone: phone,
                email: orderData.customerEmail || '',
                address: {
                    addressLine1: orderData.deliveryAddress,
                    cityName:     orderData.cityName,
                    countryCode:  orderData.destCountry || 'PK',
                    postalCode:   orderData.postalCode || '00000',
                },
            },
            packages: [{
                weight:   Number(orderData.weight || 0.5),
                dimensions: {
                    length: Number(orderData.length || 20),
                    width:  Number(orderData.width || 15),
                    height: Number(orderData.height || 10),
                },
                customerReferences: [{ value: orderData.orderRefNumber, typeCode: 'CU' }],
            }],
            content: {
                packages: [{
                    item: [{ number: 1, description: orderData.orderDetail || 'Goods', price: Number(orderData.declaredValue || 100), quantity: { value: Number(orderData.items || 1) } }],
                }],
                isCustomsDeclarable: orderData.destCountry !== 'PK',
                declaredValue:        Number(orderData.declaredValue || 100),
                declaredValueCurrency: 'PKR',
                description: orderData.orderDetail || 'E-commerce goods',
                incoterm: 'DAP',
                unitOfMeasurement: 'metric',
                exportDeclaration: { lineItems: [] },
            },
        };

        const data = await dhlRequest('/shipments', apiKey, apiSecret, {}, 'POST', payload);

        return {
            configured: true,
            success: true,
            trackingNumber: data.shipmentTrackingNumber || data.trackingNumber,
            label:          data.documents?.[0]?.content || null,
            orderRefNumber: orderData.orderRefNumber,
            raw: data,
        };
    } catch (e) {
        console.error('[DHL createShipment Error]', e.message);
        return { configured: true, success: false, error: e.message };
    }
}

/**
 * Track a DHL shipment
 * GET /tracking
 */
export async function trackDHLShipment(apiKey, apiSecret, trackingNumber) {
    if (!isDHLConfigured(apiKey, apiSecret, '')) return { configured: false };
    try {
        const data = await dhlRequest('/tracking', apiKey, apiSecret, {
            shipmentTrackingNumber: trackingNumber,
        });
        return { configured: true, ...data };
    } catch (e) {
        console.error('[DHL Track Error]', e.message);
        return { configured: true, error: e.message };
    }
}

export function mapDHLStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'completed';
    if (s.includes('returned') || s.includes('cancel') || s.includes('failure')) return 'cancelled';
    if (s.includes('transit') || s.includes('picked') || s.includes('clearance') || s.includes('out for delivery') || s.includes('arrived')) return 'processing';
    return 'pending';
}

export function normalizeDHLShipment(o) {
    if (!o) return {};
    const consignee = o.shipperDetails?.name || o.receiverDetails?.name || 'Unknown';
    return {
        id:            o.shipmentTrackingNumber,
        number:        o.shipmentTrackingNumber,
        status:        mapDHLStatus(o.status),
        rawStatus:     o.status || '—',
        date:          o.shipmentDate || o.created_at,
        customerName:  consignee,
        customerPhone: o.receiverDetails?.phone || '—',
        city:          o.receiverDetails?.address?.cityName || '—',
        address: {
            shipping: {
                first_name: consignee.split(' ')[0],
                last_name:  consignee.split(' ').slice(1).join(' '),
                address1:   o.receiverDetails?.address?.addressLine || '—',
                city:       o.receiverDetails?.address?.cityName || '—',
                country:    o.receiverDetails?.address?.countryCode || 'PK',
            },
            billing: {
                address1: o.receiverDetails?.address?.addressLine || '—',
                city:     o.receiverDetails?.address?.cityName || '—',
                country:  'PK',
            },
        },
        total:         parseFloat(o.shipmentDetails?.declaredValue) || 0,
        currency:      o.shipmentDetails?.declaredValueCurrencyCode || 'PKR',
        paymentMethod: 'Prepaid',
        itemCount:     1,
        items:         [{ name: 'DHL Express Shipment', quantity: 1, price: 0, subtotal: 0 }],
    };
}
