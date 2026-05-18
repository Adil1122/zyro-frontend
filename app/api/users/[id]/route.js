import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error fetching user:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      timezone, 
      currency,
      business_name,
      business_type,
      monthly_orders,
      connected_source,
      connected_courier,
      onboarding_completed,
      onboarding_step,
      niche,
      channels
    } = body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    
    // Onboarding and premium signup columns
    if (business_name !== undefined) updateData.business_name = business_name;
    if (business_type !== undefined) updateData.business_type = business_type;
    if (monthly_orders !== undefined) updateData.monthly_orders = monthly_orders;
    if (connected_source !== undefined) updateData.connected_source = connected_source;
    if (connected_courier !== undefined) updateData.connected_courier = connected_courier;
    if (onboarding_completed !== undefined) updateData.onboarding_completed = onboarding_completed;
    if (onboarding_step !== undefined) updateData.onboarding_step = onboarding_step;
    if (niche !== undefined) updateData.niche = niche;
    if (channels !== undefined) updateData.channels = channels;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return new Response(JSON.stringify({ user: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error updating user in API route:', e);
    return new Response(JSON.stringify({ error: e.message || 'Failed to update user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
