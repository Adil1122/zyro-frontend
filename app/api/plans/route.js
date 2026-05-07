import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });
    if (error) throw error;
    return new Response(JSON.stringify({ plans }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error fetching plans:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch plans' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
