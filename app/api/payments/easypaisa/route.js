import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { planId, userId, senderNumber, transactionId, screenshot } = await request.json();

    if (!planId || !userId || !senderNumber || !transactionId || !screenshot) {
      throw new Error('All fields are required (Plan, Sender Number, Transaction ID, and Screenshot)');
    }

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Selected plan not found');
    }

    // Update user subscription with manual payment details
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan_id: plan.id,
        subscription_status: 'pending_verification',
        manual_payment_sender: senderNumber,
        manual_payment_tid: transactionId,
        manual_payment_screenshot: screenshot,
        manual_payment_method: 'easypaisa',
        last_payment_amount: plan.price,
        last_payment_date: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to submit manual payment: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Your EasyPaisa payment receipt was submitted successfully! Our team will verify and activate your subscription shortly.' 
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('EasyPaisa Manual Payment Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
