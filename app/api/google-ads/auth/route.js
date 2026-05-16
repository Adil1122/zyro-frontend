import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Google Ads OAuth Configuration
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''); // Remove trailing slash
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/google-ads/callback`;

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

  // Get user's Google Ads credentials from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('google_ads_client_id, google_ads_client_secret, google_ads_developer_token')
    .eq('id', userId)
    .single();

  if (userError || !user || !user.google_ads_client_id || !user.google_ads_client_secret) {
    return NextResponse.json({ error: 'Google Ads credentials not configured. Please set up your Google Ads Client ID, Client Secret, and Developer Token in the API Credentials section.' }, { status: 400 });
  }

  // Generate state parameter for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store state in database for verification
  await supabase
    .from('oauth_states')
    .upsert({
      user_id: userId,
      provider: 'google_ads',
      state: state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

  // Construct Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', user.google_ads_client_id);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/adwords');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return NextResponse.json({ authUrl: authUrl.toString() });
}
