import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const { data: record } = await supabase
            .from('otp_verifications')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .eq('otp', otp.trim())
            .maybeSingle();

        if (!record) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        if (new Date(record.expires_at) < new Date()) {
            await supabase.from('otp_verifications').delete().eq('email', email.toLowerCase().trim());
            return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
        }

        // OTP verified — delete it
        await supabase.from('otp_verifications').delete().eq('email', email.toLowerCase().trim());

        return NextResponse.json({ success: true, verified: true });

    } catch (error) {
        console.error('[Verify OTP Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
