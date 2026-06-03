import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPostExOrder } from '@/lib/services/postexService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    let logs = [];
    
    try {
        const { data: pendingOrder } = await supabase
            .from('wa_pending_orders')
            .select('*')
            .eq('id', '41c3255e-6b70-4a83-acdd-e69be4a0ac1a')
            .single();
            
        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key')
            .eq('id', pendingOrder.user_id)
            .single();
            
        logs.push('Calling PostEx API...');
        
        const postexResult = await createPostExOrder(user.postex_api_key, {
            orderRefNumber: pendingOrder.order_ref,
            customerName: pendingOrder.customer_name,
            customerPhone: pendingOrder.phone,
            deliveryAddress: pendingOrder.delivery_address || 'N/A',
            cityName: pendingOrder.city_name || 'Karachi',
            invoicePayment: pendingOrder.total_amount,
            orderDetail: pendingOrder.order_detail || '',
        });
        
        logs.push(`PostEx Result: ${JSON.stringify(postexResult)}`);
        
        return NextResponse.json({ success: true, logs, postexResult });
    } catch (e) {
        logs.push(`FATAL ERROR: ${e.message}`);
        return NextResponse.json({ success: false, logs, error: e.message });
    }
}
