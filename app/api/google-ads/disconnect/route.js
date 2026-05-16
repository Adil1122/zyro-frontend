import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Helper function to get user ID from request
function getUserIdFromRequest(request) {
  // Try to get user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get user ID from custom header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }
  
  // Try to get user ID from cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.user_id) {
      return cookies.user_id;
    }
  }
  
  return null;
}

export async function POST(request) {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clear Google Ads credentials and tokens from user record
    const { error } = await supabase
      .from('users')
      .update({
        google_ads_access_token: null,
        google_ads_refresh_token: null,
        google_ads_token_expires_at: null,
        google_ads_customer_id: null,
        google_ads_connected_at: null,
        google_ads_enabled: false
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Optionally clear Google Ads campaigns and stats data
    await supabase
      .from('google_ads_campaigns')
      .delete()
      .eq('user_id', userId);

    await supabase
      .from('google_ads_stats')
      .delete()
      .eq('user_id', userId);

    await supabase
      .from('google_ad_accounts')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Google Ads disconnected successfully' 
    });

  } catch (error) {
    console.error('Failed to disconnect Google Ads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
