import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserId } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET(request) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's stored credentials (excluding secrets for security)
    const { data: user, error } = await supabase
      .from('users')
      .select('meta_app_id, google_ads_client_id, meta_ads_enabled, google_ads_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      meta_app_id: user?.meta_app_id || null,
      google_ads_client_id: user?.google_ads_client_id || null,
      meta_ads_enabled: user?.meta_ads_enabled || false,
      google_ads_enabled: user?.google_ads_enabled || false,
    });

  } catch (error) {
    console.error('Failed to fetch user credentials:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { meta_app_id, meta_app_secret, google_ads_client_id, google_ads_client_secret, google_ads_developer_token } = await request.json();

    // Store credentials in database
    const updateData = {};
    
    if (meta_app_id && meta_app_secret) {
      updateData.meta_app_id = meta_app_id;
      updateData.meta_app_secret = meta_app_secret;
      updateData.meta_ads_enabled = true;
    }

    if (google_ads_client_id && google_ads_client_secret && google_ads_developer_token) {
      updateData.google_ads_client_id = google_ads_client_id;
      updateData.google_ads_client_secret = google_ads_client_secret;
      updateData.google_ads_developer_token = google_ads_developer_token;
      updateData.google_ads_enabled = true;
    }

    // Only update fields that are provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No credentials provided' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Credentials saved successfully',
      meta_ads_enabled: updateData.meta_ads_enabled || false,
      google_ads_enabled: updateData.google_ads_enabled || false
    });

  } catch (error) {
    console.error('Failed to save user credentials:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
