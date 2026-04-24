import { supabase } from '../supabase';

export const couriersService = {
    async getCouriers(page = 1, pageSize = 10) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: couriers, count, error } = await supabase
            .from('couriers')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        return {
            data: (couriers || []).map(c => ({
                id: c.id,
                name: c.name,
                status: c.status,
                codInTransit: c.cod_in_transit,
                pendingBooking: c.pending_booking,
                rates: c.shipping_rates,
                logo: this.getLogo(c.name)
            })),
            meta: {
                pagination: {
                    total: count || 0,
                    page,
                    pageSize,
                    lastPage: Math.ceil((count || 0) / pageSize)
                }
            }
        };
    },

    async getShipments(page = 1, pageSize = 10) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: shipments, count, error } = await supabase
            .from('shipments')
            .select(`
        *,
        orders (
          id,
          order_id,
          total_amount,
          customers (
            id,
            name,
            city
          )
        )
      `, { count: 'exact' })
            .order('id', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return {
            data: (shipments || []).map(s => {
                const order = s.orders;
                const customer = order?.customers;
                return {
                    cn: s.tracking_id,
                    customer: customer?.name || 'Unknown',
                    city: customer?.city || '—',
                    courier: 'TCS',
                    status: s.status,
                    stage: this.mapStatusToStage(s.status),
                    eta: '2-3 Days',
                    cod: order?.total_amount || 0
                };
            }),
            meta: {
                pagination: {
                    total: count || 0,
                    page,
                    pageSize,
                    lastPage: Math.ceil((count || 0) / pageSize)
                }
            }
        };
    },

    mapStatusToStage(status) {
        if (!status) return 2;
        const s = status.toLowerCase();
        if (s.includes('delivered')) return 5;
        if (s.includes('processing')) return 1;
        if (s.includes('transit')) return 3;
        if (s.includes('out')) return 4;
        if (s.includes('return')) return 0;
        return 2;
    },

    getLogo(name) {
        if (name.toLowerCase().includes('tcs')) return 'https://seeklogo.com/images/T/tcs-courier-logo-4A7B3E368F-seeklogo.com.png';
        if (name.toLowerCase().includes('leopard')) return 'https://seeklogo.com/images/L/leopards-courier-logo-7B3B5B8B7B-seeklogo.com.png';
        if (name.toLowerCase().includes('trax')) return 'https://seeklogo.com/images/T/trax-courier-logo-6B3B5B8B7B-seeklogo.com.png';
        return '';
    }
};
