import crypto from 'crypto';

const REGION_BASE_URL = {
    pk: 'https://api.daraz.pk/rest',
    bd: 'https://api.daraz.com.bd/rest',
    lk: 'https://api.daraz.lk/rest',
    my: 'https://api.lazada.com.my/rest',
    sg: 'https://api.lazada.sg/rest',
    th: 'https://api.lazada.co.th/rest',
    ph: 'https://api.lazada.com.ph/rest',
    id: 'https://api.lazada.co.id/rest',
    vn: 'https://api.lazada.vn/rest',
};

function getBaseUrl(region = 'pk') {
    return REGION_BASE_URL[region.toLowerCase()] || REGION_BASE_URL['pk'];
}

function generateSignature(apiPath, params, appSecret) {
    const sortedKeys = Object.keys(params).sort();
    let base = apiPath;
    for (const key of sortedKeys) {
        base += key + params[key];
    }
    return crypto
        .createHmac('sha256', appSecret)
        .update(base, 'utf-8')
        .digest('hex')
        .toUpperCase();
}

function buildParams(credentials, extraParams = {}) {
    const params = {
        app_key: credentials.appKey,
        access_token: credentials.accessToken,
        timestamp: Date.now().toString(),
        sign_method: 'sha256',
        ...extraParams,
    };
    return params;
}

async function darazGet(apiPath, extra = {}, credentials) {
    const baseUrl = getBaseUrl(credentials.region || 'pk');
    const params = buildParams(credentials, extra);
    const sign = generateSignature(apiPath, params, credentials.appSecret);

    const qs = new URLSearchParams({ ...params, sign }).toString();
    const url = `${baseUrl}${apiPath}?${qs}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Daraz API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();

    if (json.code && json.code !== '0' && json.code !== 0) {
        throw new Error(`Daraz API: [${json.code}] ${json.message || 'Unknown error'}`);
    }

    return json.data ?? json.result ?? json;
}

export function isDarazConfigured(user) {
    return !!(user?.daraz_access_token);
}

export function getCredentials(user) {
    return {
        appKey: process.env.DARAZ_APP_KEY,
        appSecret: process.env.DARAZ_APP_SECRET,
        accessToken: user.daraz_access_token,
        region: user.daraz_region || 'pk',
    };
}

// UI status values → normalized display values (for client-side filtering only)
// We do NOT send status to Daraz API as it rejects most filter combinations (E036)
const STATUS_MAP = {
    processing:  'processing',
    packed:      'packed',
    shipped:     'shipped',
    pending:     'pending',
    delivered:   'delivered',
    returned:    'returned',
    canceled:    'canceled',
    cancelled:   'canceled',
};

export async function getDarazStats(credentials) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayData = await darazGet('/orders/get', {
        created_after: toDarazDate(todayStart),
        created_before: toDarazDate(new Date()),
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: 100,
        offset: 0,
    }, credentials);

    const todayOrders = todayData?.orders || [];
    const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const totalData = await darazGet('/orders/get', {
        created_after: toDarazDate(ninetyDaysAgo),
        created_before: toDarazDate(new Date()),
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: 100,
        offset: 0,
    }, credentials);

    const totalOrderCount = totalData?.count_total ?? (totalData?.orders?.length ?? 0);
    const totalRevenue = (totalData?.orders || []).reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

    return {
        totalOrders: totalOrderCount,
        totalRevenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        currency: 'PKR',
        period: 'last 90 days',
    };
}

// Daraz expects "YYYY-MM-DDTHH:mm:ss" — ISO 8601 without timezone or milliseconds
function toDarazDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function getDarazOrders({ page = 1, perPage = 10, search = '', status = 'all', credentials } = {}) {
    const offset = (page - 1) * perPage;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    const endDate = new Date();

    // Daraz API rejects status filter combinations (E036) — fetch all, filter client-side
    const data = await darazGet('/orders/get', {
        created_after: toDarazDate(startDate),
        created_before: toDarazDate(endDate),
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: perPage,
        offset,
    }, credentials);

    const rawOrders = data?.orders || [];

    // /orders/get does not include item details — fetch per order in parallel (max 10)
    let itemsByOrderId = {};
    if (rawOrders.length > 0) {
        const results = await Promise.allSettled(
            rawOrders.map(o => fetchOrderItems(o.order_id, credentials))
        );
        for (let i = 0; i < rawOrders.length; i++) {
            const r = results[i];
            if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
                itemsByOrderId[String(rawOrders[i].order_id)] = r.value;
            }
        }
    }

    let orders = rawOrders.map(o => normalizeOrder(o, itemsByOrderId[String(o.order_id)]));

    if (status && status !== 'all') {
        const mapped = STATUS_MAP[status] || status;
        orders = orders.filter(o => o.status === mapped);
    }

    if (search) {
        orders = orders.filter(o =>
            o.id.toString().includes(search) ||
            o.number.toString().includes(search)
        );
    }

    const totalOrders = data?.count_total ?? orders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

    return {
        orders,
        pagination: { page, perPage, totalOrders, totalPages },
    };
}

async function fetchOrderItems(orderId, credentials) {
    try {
        const data = await darazGet('/order/items/get', { order_id: String(orderId) }, credentials);
        console.log('[Daraz] items for', orderId, ':', JSON.stringify(data)?.slice(0, 200));
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
            // { "orderId": [{item}] } or { items: [{item}] }
            const nested = data[String(orderId)] || data.items || Object.values(data).find(Array.isArray);
            return Array.isArray(nested) ? nested : [];
        }
        return [];
    } catch (e) {
        console.warn('[Daraz] fetchOrderItems', orderId, e.message);
        return [];
    }
}

export async function getDarazOrderById(orderId, credentials) {
    const data = await darazGet('/order/get', { order_id: orderId }, credentials);
    const orders = data?.data?.orders || data?.orders || [];
    if (orders.length === 0) return null;
    const order = orders[0];
    const fetchedItems = await fetchOrderItems(order.order_id, credentials);
    return normalizeOrder(order, fetchedItems.length > 0 ? fetchedItems : undefined);
}

export async function syncDarazOrdersToDB(credentials, userId, supabase) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const data = await darazGet('/orders/get', {
        created_after: toDarazDate(ninetyDaysAgo),
        created_before: toDarazDate(new Date()),
        sort_by: 'created_at',
        sort_direction: 'DESC',
        limit: 100,
        offset: 0,
    }, credentials);

    const darazOrders = data?.orders || [];
    let synced = 0;

    for (const dOrder of darazOrders) {
        try {
            const normalized = normalizeOrder(dOrder);
            const orderNumber = String(normalized.number || normalized.id);

            // Upsert customer
            let customerId = null;
            if (normalized.customerEmail || normalized.customerPhone) {
                const customerData = {
                    user_id: userId,
                    name: normalized.customerName,
                    email: normalized.customerEmail || '',
                    contact: normalized.customerPhone || normalized.customerEmail || '',
                    city: normalized.city || '',
                    status: 'active',
                };

                const query = normalized.customerEmail
                    ? supabase.from('customers').select('id').eq('user_id', userId).eq('email', normalized.customerEmail)
                    : supabase.from('customers').select('id').eq('user_id', userId).eq('contact', normalized.customerPhone);

                const { data: existing } = await query.maybeSingle();

                if (existing?.id) {
                    customerId = existing.id;
                    await supabase.from('customers').update(customerData).eq('id', existing.id);
                } else {
                    const { data: newC } = await supabase.from('customers').insert(customerData).select('id').single();
                    customerId = newC?.id;
                }
            }

            // Upsert order
            const orderData = {
                user_id: userId,
                customer_id: customerId,
                order_id: orderNumber,
                platform_id: 5, // Daraz
                status: normalized.status,
                total_amount: normalized.total,
            };

            const { data: existingOrder } = await supabase
                .from('orders')
                .select('id')
                .eq('user_id', userId)
                .eq('order_id', orderNumber)
                .maybeSingle();

            if (existingOrder?.id) {
                await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
            } else {
                await supabase.from('orders').insert(orderData);
                synced++;
            }
        } catch (e) {
            console.error('[Daraz Sync] Error syncing order:', e.message);
        }
    }

    return { total: darazOrders.length, synced };
}

function normalizeOrder(dOrder, fetchedItems) {
    const rawItems = fetchedItems || dOrder.order_items || dOrder.items || [];
    const items = rawItems.map(item => ({
        name: item.name || item.item_name || item.product_name || item.seller_sku || item.sku || 'Item',
        quantity: parseInt(item.quantity || item.qty || 1, 10),
        price: parseFloat(item.item_price || item.price || 0),
        subtotal: parseFloat(item.paid_price || item.subtotal || item.item_price || 0),
        sku: item.seller_sku || item.sku || '',
        status: item.status || '',
    }));

    const firstName = dOrder.customer_first_name || '';
    const lastName = dOrder.customer_last_name || '';
    const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Masked / Guest';

    // Primary product name shown in the table row
    const primaryProduct = items.length > 0
        ? items[0].name + (items.length > 1 ? ` +${items.length - 1} more` : '')
        : '—';

    return {
        id: dOrder.order_id,
        number: dOrder.order_number || dOrder.order_id,
        status: mapDarazStatus(dOrder.statuses || dOrder.status || 'pending'),
        date: dOrder.created_at,
        customerName,
        customerEmail: dOrder.customer_email || '',
        customerPhone: dOrder.address_billing?.phone || dOrder.customer_phone || '',
        city: dOrder.address_billing?.city || dOrder.address_shipping?.city || '',
        total: parseFloat(dOrder.price || 0),
        currency: 'PKR',
        paymentMethod: dOrder.payment_method || '',
        itemCount: parseInt(dOrder.items_count || rawItems.length || 1, 10),
        primaryProduct,
        items,
    };
}

function mapDarazStatus(rawStatus) {
    const statusStr = Array.isArray(rawStatus) ? rawStatus.join(',') : String(rawStatus || '');
    if (statusStr.includes('delivered')) return 'delivered';
    if (statusStr.includes('shipped')) return 'shipped';
    if (statusStr.includes('packed')) return 'packed';
    if (statusStr.includes('processing')) return 'processing';
    if (statusStr.includes('returned')) return 'returned';
    if (statusStr.includes('canceled') || statusStr.includes('cancelled')) return 'cancelled';
    if (statusStr.includes('unpaid')) return 'pending';
    if (statusStr.includes('pending')) return 'pending';
    return 'pending';
}
