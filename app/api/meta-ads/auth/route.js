import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Meta App Configuration
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''); // Remove trailing slash
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${appUrl}/api/meta-ads/callback`;

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

export async function GET(request) {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's Meta Ads credentials from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('meta_app_id, meta_app_secret')
    .eq('id', userId)
    .single();

  if (userError || !user || !user.meta_app_id || !user.meta_app_secret) {
    return NextResponse.json({ error: 'Meta Ads credentials not configured. Please set up your Meta App ID and Secret in the API Credentials section.' }, { status: 400 });
  }

  // Generate state parameter for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store state in session or database for verification
  await supabase
    .from('oauth_states')
    .upsert({
      user_id: userId,
      provider: 'meta_ads',
      state: state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

  // Construct Meta OAuth URL
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.append('client_id', user.meta_app_id);
  authUrl.searchParams.append('redirect_uri', META_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'ads_read,business_management');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);

  return NextResponse.json({ authUrl: authUrl.toString() });
}
