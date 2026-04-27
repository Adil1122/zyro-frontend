import { supabase, getCurrentUserId } from '../supabase';

export const marketingService = {
    async getMarketingData(page = 1, pageSize = 10) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const userId = getCurrentUserId();

        let query = supabase
            .from('ads_campaign')
            .select('*, marketing_creatives(*)', { count: 'exact' });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: campaigns, count, error } = await query
            .range(from, to);

        if (error) throw error;

        return {
            data: (campaigns || []).map(c => ({
                id: c.id,
                name: c.campaign_name || 'Unnamed Campaign',
                status: 'Active',
                budget: parseFloat(c.spend || '0'),
                creatives: (c.marketing_creatives || []).map(cr => ({
                    id: cr.id,
                    name: cr.creative_name,
                    type: cr.type,
                    url: cr.asset_url
                }))
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
    }
};
