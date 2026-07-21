import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { emailService } from '@/lib/services/emailService';

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
    try {
        const { email, name } = await request.json();

        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        // Check if email already registered
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Delete any existing OTP for this email
        await supabase.from('otp_verifications').delete().eq('email', email.toLowerCase().trim());

        // Store new OTP
        const { error: dbError } = await supabase.from('otp_verifications').insert({
            email: email.toLowerCase().trim(),
            otp,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
        });

        if (dbError) {
            console.error('[OTP DB Error]', dbError.message);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // Send OTP email via emailService
        const { error: emailError } = await emailService.sendOTP(email, name, otp);

        if (emailError) {
            console.error('[OTP Email Error]', emailError.message);
            return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Verification code sent to ${email}` });

    } catch (error) {
        console.error('[Send OTP Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
