import { supabase } from '../supabase';

export const whatsappService = {
    async getWhatsappData() {
        // 1. Fetch Conversations
        const { data: conversations, error } = await supabase
            .from('wa_conversations')
            .select('*, customers(name), wa_messages(*)');

        if (error) throw error;

        // 2. Map to UI structure
        const allChats = (conversations || []).map(c => ({
            id: c.id,
            name: c.customers?.name || 'Guest',
            phone: c.phone_number,
            lastMsg: c.last_message,
            time: this.formatTime(c.updated_at),
            order: c.order_id,
            status: c.status,
            msgs: (c.wa_messages || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(m => ({
                from: m.sender_type,
                text: m.message_text,
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                conf: m.ai_confidence
            }))
        }));

        const botChats = allChats.filter(c => c.status === 'ai_handling');
        const supportChats = allChats.filter(c => c.status === 'manual_support');

        // 3. KPIs
        const { count: escalatedCount } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');

        return {
            botChats,
            supportChats: supportChats.map(s => ({ ...s, unread: 1, reason: 'Escalated' })),
            kpis: {
                today: 127,
                aiRate: '94%',
                avgReply: '1.2s',
                escalated: escalatedCount || 0
            }
        };
    },

    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return `${Math.floor(diffMins / 1440)}d`;
    }
};
