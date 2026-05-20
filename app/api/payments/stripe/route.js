import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { planId, userId, paymentMethodId, action } = await request.json();
    console.log("Stripe POST params received:", { planId, userId, paymentMethodId, action });

    if (!userId) {
      throw new Error(`userId is required but was received as: "${userId}"`);
    }

    // 1. Fetch user and their keys
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error("Stripe user query error:", userError);
      throw new Error(`User not found: ${userError ? userError.message : 'No matching row'} (ID: "${userId}")`);
    }

    const stripeSecretKey = user.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) throw new Error('Stripe Secret Key not configured');

    const stripe = new Stripe(stripeSecretKey);

    if (action === 'cancel') {
      return await handleCancellation(stripe, user);
    }

    // 2. Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) throw new Error('Plan not found');

    // 2b. Cancel previous subscription and pro-rate refund if switching plans
    let refundInfo = null;
    if (user.stripe_subscription_id && user.plan_id !== planId) {
      try {
        const oldSubscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        
        // Calculate refund amount (pro-rated)
        const now = Math.floor(Date.now() / 1000);
        const periodStart = oldSubscription.current_period_start || now;
        const periodEnd = oldSubscription.current_period_end || (now + 2592000);
        const totalPeriod = Math.max(1, periodEnd - periodStart);
        const remainingTime = Math.max(0, periodEnd - now);
        
        const refundAmount = Math.max(0, ((user.last_payment_amount || 0) * (remainingTime / totalPeriod)));

        // Cancel old subscription
        await stripe.subscriptions.cancel(user.stripe_subscription_id);

        // Refund if there's a recent charge
        if (oldSubscription.latest_invoice && refundAmount > 0) {
          const latestInvoice = await stripe.invoices.retrieve(oldSubscription.latest_invoice);
          if (latestInvoice.payment_intent) {
            await stripe.refunds.create({
              payment_intent: latestInvoice.payment_intent,
              amount: Math.round(refundAmount * 100),
            });
            refundInfo = { refunded: refundAmount };
          }
        }
      } catch (cancelError) {
        console.error('Error cancelling/refunding previous plan subscription:', cancelError);
      }
    }

    // 3. Create or get customer
    let customerId = user.stripe_customer_id;
    let customerExists = false;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        customerExists = true;
      } catch (err) {
        if (err.message.includes('No such customer') || err.code === 'resource_missing') {
          console.warn(`Stale customer ID found in DB: ${customerId}. Recreating...`);
          customerExists = false;
        } else {
          throw err;
        }
      }
    }

    let finalPaymentMethodId = paymentMethodId;

    if (!customerId || !customerExists) {
      // Create customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
      
      // Attach payment method
      const attachedMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      finalPaymentMethodId = attachedMethod.id;
      
      // Set as default
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: finalPaymentMethodId },
      });
    } else {
      // Update payment method
      const attachedMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      finalPaymentMethodId = attachedMethod.id;
      
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: finalPaymentMethodId },
      });
    }

    // 4. Create Subscription
    // Note: In a real app, you'd create a Price in Stripe. 
    // Here we'll create a simple one-off or recurring setup.
    // For simplicity, we'll assume a Price object exists or we create a temporary one.
    const price = await stripe.prices.create({
        unit_amount: Math.round(plan.price * 100), // convert to cents
        currency: plan.currency.toLowerCase(),
        recurring: { interval: 'month' },
        product_data: { name: plan.name },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      expand: ['latest_invoice.payment_intent'],
    });

    // 5. Update user in DB
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString() 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Fallback to 30 days

    await supabase
      .from('users')
      .update({
        plan_id: plan.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        current_period_end: periodEnd,
        last_payment_amount: plan.price,
        last_payment_date: new Date().toISOString()
      })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true, subscription, refunded: refundInfo ? refundInfo.refunded : 0 }), { status: 200 });

  } catch (err) {
    console.error('Stripe Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function handleCancellation(stripe, user) {
  if (!user.stripe_subscription_id) throw new Error('No active subscription found');

  const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
  
  // Calculate refund amount (pro-rated)
  const now = Math.floor(Date.now() / 1000);
  const periodStart = subscription.current_period_start || now;
  const periodEnd = subscription.current_period_end || (now + 2592000);
  const totalPeriod = Math.max(1, periodEnd - periodStart);
  const remainingTime = Math.max(0, periodEnd - now);
  
  const refundAmount = Math.max(0, (user.last_payment_amount * (remainingTime / totalPeriod)));

  // Cancel subscription
  await stripe.subscriptions.cancel(user.stripe_subscription_id);

  // Refund if there's a recent charge
  const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);
  if (latestInvoice.payment_intent && refundAmount > 0) {
    await stripe.refunds.create({
      payment_intent: latestInvoice.payment_intent,
      amount: Math.round(refundAmount * 100),
    });
  }

  // Update DB
  await supabase
    .from('users')
    .update({
      plan_id: null,
      stripe_subscription_id: null,
      subscription_status: 'cancelled',
      last_payment_amount: 0
    })
    .eq('id', user.id);

  return new Response(JSON.stringify({ success: true, refunded: refundAmount }), { status: 200 });
}
