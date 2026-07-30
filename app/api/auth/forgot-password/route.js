import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { emailService } from '@/lib/services/emailService';
import { randomUUID } from 'crypto';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Look up the user — don't reveal whether they exist
        const { data: user } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (user) {
            const token = randomUUID();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            // Delete any existing unexpired tokens for this user
            await supabase
                .from('password_reset_tokens')
                .delete()
                .eq('user_id', user.id);

            const { error: dbError } = await supabase
                .from('password_reset_tokens')
                .insert({ user_id: user.id, token, expires_at: expiresAt });

            if (dbError) {
                console.error('[ForgotPassword DB]', dbError.message);
                return NextResponse.json({ error: 'Failed to create reset token' }, { status: 500 });
            }

            const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com'}/reset-password?token=${token}`;

            const { error: emailError } = await emailService.sendPasswordReset(
                user.email,
                user.name,
                resetUrl
            );

            if (emailError) {
                console.error('[ForgotPassword Email]', emailError.message);
            }
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({
            success: true,
            message: 'If an account exists with that email, a reset link has been sent.',
        });

    } catch (error) {
        console.error('[ForgotPassword Error]', error.message);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
