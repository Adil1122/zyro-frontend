import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select(`
        *,
        plan_features (
          feature_name,
          value
        )
      `)
      .order('price', { ascending: true });
    
    if (error) throw error;
    
    // Transform the data to group features by plan
    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      features: plan.plan_features ? 
        plan.plan_features.reduce((acc, feature) => {
          acc[feature.feature_name] = feature.value;
          return acc;
        }, {}) : {}
    }));
    
    return new Response(JSON.stringify({ plans: plansWithFeatures }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    console.error('Error fetching plans:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch plans' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
