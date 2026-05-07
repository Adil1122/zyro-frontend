import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { planId, userId, mobileNumber } = await request.json();

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();

    if (!user.jazzcash_merchant_id || !user.jazzcash_password || !user.jazzcash_integrity_salt) {
      throw new Error('JazzCash credentials not configured for this user');
    }

    const merchantId = user.jazzcash_merchant_id;
    const password = user.jazzcash_password;
    const salt = user.jazzcash_integrity_salt;
    const amount = Math.round(plan.price * 100); // In Paisas
    const txnRef = `ZYRO-${Date.now()}`;
    const dateTime = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const expiryDateTime = new Date(Date.now() + 3600000).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    const payload = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRef,
      pp_Amount: amount.toString(),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: dateTime,
      pp_BillReference: 'PlanSubscription',
      pp_Description: `Zyro ${plan.name} Plan`,
      pp_TxnExpiryDateTime: expiryDateTime,
      pp_MobileNumber: mobileNumber,
      pp_SecureHash: ''
    };

    // Calculate Secure Hash
    const sortedKeys = Object.keys(payload).sort();
    let message = salt;
    for (const key of sortedKeys) {
      if (payload[key] !== '') message += `&${payload[key]}`;
    }
    
    payload.pp_SecureHash = crypto.createHmac('sha256', salt).update(message).digest('hex').toUpperCase();

    // In a real scenario, you'd post to JazzCash URL. 
    // Here we'll simulate a successful transaction and update DB.
    
    await supabase.from('users').update({
        plan_id: plan.id,
        subscription_status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_payment_amount: plan.price,
        last_payment_date: new Date().toISOString()
    }).eq('id', userId);

    return new Response(JSON.stringify({ success: true, txnRef }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
