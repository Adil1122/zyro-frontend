import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data: pending, error } = await supabase.from('wa_pending_orders').select('*').order('created_at', { ascending: false }).limit(5);
    return NextResponse.json({ pending, error });
}
