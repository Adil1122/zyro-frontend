import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function POST(request) {
  try {
    const { event, utm_params, timestamp, page_url } = await request.json();

    // Store UTM tracking event
    const { error } = await supabase
      .from('utm_tracking_events')
      .insert({
        event_type: event,
        utm_source: utm_params.utm_source,
        utm_medium: utm_params.utm_medium,
        utm_campaign: utm_params.utm_campaign,
        utm_term: utm_params.utm_term,
        utm_content: utm_params.utm_content,
        gclid: utm_params.gclid,
        fbclid: utm_params.fbclid,
        page_url: page_url,
        timestamp: timestamp,
        user_agent: request.headers.get('user-agent'),
        ip_address: request.ip || request.headers.get('x-forwarded-for'),
      });

    if (error) {
      console.error('Failed to store UTM tracking event:', error);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('UTM tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
