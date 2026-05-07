import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { planId, userId, mobileNumber } = await request.json();

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();

    if (!user.easypaisa_merchant_id || !user.easypaisa_store_id || !user.easypaisa_hash_key) {
      throw new Error('EasyPaisa credentials not configured');
    }

    const orderId = `EP-${Date.now()}`;
    const amount = plan.price.toFixed(1);
    
    // EasyPaisa logic usually involves a redirection hash or direct API
    // This is a simplified version of their HMAC logic
    const message = `amount=${amount}&orderId=${orderId}&storeId=${user.easypaisa_store_id}`;
    const hash = crypto.createHmac('sha256', user.easypaisa_hash_key).update(message).digest('hex');

    // Simulate success
    await supabase.from('users').update({
        plan_id: plan.id,
        subscription_status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_payment_amount: plan.price,
        last_payment_date: new Date().toISOString()
    }).eq('id', userId);

    return new Response(JSON.stringify({ success: true, orderId, hash }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
