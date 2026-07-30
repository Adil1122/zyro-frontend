import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Look up token
        const { data: resetToken, error: tokenErr } = await supabase
            .from('password_reset_tokens')
            .select('id, user_id, expires_at, used')
            .eq('token', token)
            .maybeSingle();

        if (tokenErr || !resetToken) {
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        if (resetToken.used) {
            return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
        }

        if (new Date(resetToken.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This reset link has expired. Please request a new one' }, { status: 400 });
        }

        // Update password via RPC (pgcrypto hashing happens in DB)
        const { error: updateErr } = await supabase.rpc('update_user_password', {
            p_user_id: resetToken.user_id,
            p_new_password: password,
        });

        if (updateErr) {
            console.error('[ResetPassword RPC]', updateErr.message);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // Mark token as used
        await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('id', resetToken.id);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('[ResetPassword Error]', error.message);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
