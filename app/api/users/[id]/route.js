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
  const body = await request.json();
  const { name, email, phone, timezone, currency } = body;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ name, email, phone, timezone, currency })
      .eq('id', id)
      .single();
    if (error) throw error;
    // Update local storage for current user
    const storedUser = localStorage.getItem('zyro_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.id === id) {
        localStorage.setItem('zyro_user', JSON.stringify(data));
        window.dispatchEvent(new Event('authChange'));
      }
    }
    return new Response(JSON.stringify({ user: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error updating user:', e);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
