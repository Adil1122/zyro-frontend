import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET(request) {
  try {
    // Get current user ID
    const userId = getCurrentUserId();
    
    // Get user data from localStorage simulation
    let userData = null;
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('zyro_user');
        userData = storedUser ? JSON.parse(storedUser) : null;
      }
    } catch (error) {
      console.error('localStorage error in debug:', error);
    }

    // Get user from database if we have an ID
    let dbUser = null;
    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error) {
        dbUser = data;
      }
    }

    return NextResponse.json({
      userId,
      localStorageUser: userData,
      databaseUser: dbUser,
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Set' : 'Missing',
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
