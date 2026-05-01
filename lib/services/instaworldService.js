
/**
 * Insta World Service
 * Handles integration with Insta World API for courier management
 */

export function isInstaWorldConfigured(apiKey) {
    return !!apiKey;
}

/**
 * Fetch Insta World stats (mocked)
 */
export async function getInstaWorldStats(apiKey) {
    if (!isInstaWorldConfigured(apiKey)) {
        return { configured: false };
    }

    return {
        configured: true,
        todayShipments: 18,
        totalShipments: 450,
        codPending: 52000,
        codRecovered: 890000,
        currency: 'PKR',
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Fetch paginated Insta World orders/shipments
 */
export async function getInstaWorldOrders({ apiKey, page = 1, perPage = 10, search = '', status = 'any' } = {}) {
    if (!isInstaWorldConfigured(apiKey)) {
        throw new Error('Insta World is not configured for this user.');
    }

    const allMockOrders = [
        { id: 201, tracking: 'IW-99001', customer: 'Kamran Akmal', city: 'Lahore', address: 'Model Town, Block G', amount: 2500, status: 'Delivered', date: '2026-04-26T11:00:00Z', phone: '03009988776', email: 'kamran@example.com' },
        { id: 202, tracking: 'IW-99002', customer: 'Mehak Gul', city: 'Karachi', address: 'Gulshan-e-Iqbal', amount: 1800, status: 'Processing', date: '2026-04-28T15:00:00Z', phone: '03212233445', email: 'mehak@example.com' },
        { id: 203, tracking: 'IW-99003', customer: 'Omer Butt', city: 'Faisalabad', address: 'Kohinoor City', amount: 9500, status: 'Pending', date: '2026-04-30T10:30:00Z', phone: '03331122334', email: 'omer@example.com' },
        { id: 204, tracking: 'IW-99004', customer: 'Sana Javed', city: 'Islamabad', address: 'Sector E-11', amount: 4200, status: 'Delivered', date: '2026-04-27T13:45:00Z', phone: '03456677889', email: 'sana@example.com' },
    ];

    let filtered = allMockOrders;
    if (status !== 'any') {
        filtered = filtered.filter(o => mapInstaWorldStatus(o.status) === status);
    }
    if (search) {
        filtered = filtered.filter(o => 
            o.tracking.toLowerCase().includes(search.toLowerCase()) || 
            o.customer.toLowerCase().includes(search.toLowerCase())
        );
    }

    const totalOrders = filtered.length;
    const totalPages = Math.ceil(totalOrders / perPage);
    const orders = filtered.slice((page - 1) * perPage, page * perPage).map(normalizeInstaWorldOrder);

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

function mapInstaWorldStatus(status) {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'completed';
    if (s.includes('transit') || s.includes('processing')) return 'processing';
    if (s.includes('booked') || s.includes('pending')) return 'pending';
    if (s.includes('return') || s.includes('cancelled')) return 'cancelled';
    return 'pending';
}

function normalizeInstaWorldOrder(o) {
    return {
        id: o.id,
        number: o.tracking,
        status: mapInstaWorldStatus(o.status),
        date: o.date,
        customerName: o.customer,
        customerEmail: o.email,
        customerPhone: o.phone,
        city: o.city,
        address: {
            shipping: {
                first_name: o.customer.split(' ')[0],
                last_name: o.customer.split(' ').slice(1).join(' '),
                address1: o.address,
                city: o.city,
                country: 'Pakistan'
            },
            billing: {
                address1: o.address,
                city: o.city,
                country: 'Pakistan'
            }
        },
        total: o.amount,
        currency: 'PKR',
        paymentMethod: 'Cash on Delivery',
        itemCount: 1,
        items: [{ name: 'Express Parcel', quantity: 1, price: o.amount, subtotal: o.amount }]
    };
}
