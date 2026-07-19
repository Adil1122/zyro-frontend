import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

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

        const digits = otp.split('');
        const digitHtml = digits.map(d =>
            `<td style="padding:0 4px;">
              <div style="width:46px;height:54px;background:#050D09;border:1.5px solid rgba(92,168,124,0.35);border-radius:10px;
                          text-align:center;line-height:54px;font-family:'Courier New',Courier,monospace;
                          font-size:26px;font-weight:800;color:#4ADE80;">
                ${d}
              </div>
            </td>`
        ).join('');

        // Send OTP email
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: emailError } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Zyro <noreply@zyro.app>',
            to: email,
            subject: `${otp} — your Zyro verification code`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${otp} — Zyro Verification</title>
</head>
<body style="margin:0;padding:0;background:#060F0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060F0B;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;border-radius:18px;overflow:hidden;border:1px solid rgba(92,168,124,0.25);">

    <!-- HEADER -->
    <tr><td style="background:linear-gradient(160deg,#132C1F 0%,#1D4033 100%);padding:34px 40px 28px;text-align:center;border-bottom:1px solid rgba(92,168,124,0.2);">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:10px;
                        text-align:center;line-height:36px;font-size:18px;">&#x2B22;</div>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:900;color:#F0FDF4;letter-spacing:-0.02em;">Zyro</span>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;color:#A7F3D0;margin-top:10px;letter-spacing:0.06em;opacity:0.7;">Smart Business Dashboard &middot; Pakistan</div>
    </td></tr>

    <!-- BODY -->
    <tr><td style="background:#0D2119;padding:36px 40px 32px;">

      <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${name || 'there'},</p>
      <h1 style="margin:0 0 14px;font-size:21px;font-weight:800;color:#F0FDF4;letter-spacing:-0.025em;line-height:1.25;">
        Verify your email address
      </h1>
      <p style="margin:0 0 30px;font-size:14px;color:#A7F3D0;line-height:1.7;opacity:0.85;">
        You're one step away from your Zyro dashboard. Enter the code below in the signup page to confirm your email and continue setting up your account.
      </p>

      <!-- OTP Block -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#050D09;border:1.5px solid rgba(92,168,124,0.32);border-radius:14px;margin-bottom:24px;">
        <tr><td style="padding:6px 0 0;text-align:center;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(92,168,124,0.45),transparent);margin-bottom:22px;"></div>
          <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5CA87C;">
            &#x1F512; Your verification code
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
            <tr>${digitHtml}</tr>
          </table>
          <p style="margin:0 0 20px;font-size:12px;color:#4D7A63;">
            &bull; &nbsp;Expires in 10 minutes
          </p>
        </td></tr>
      </table>

      <!-- Security note -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.12);border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;font-size:12px;color:#4D7A63;line-height:1.6;">
            &#x1F6E1;&nbsp; If you didn't request this, you can safely ignore this email — your account won't be created.
            <strong style="color:#5CA87C;">Never share this code with anyone.</strong> Zyro will never ask for it.
          </td>
        </tr>
      </table>

    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#0A1912;border-top:1px solid rgba(92,168,124,0.1);padding:20px 40px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
        <tr>
          <td style="padding:0 10px;"><a href="#" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Help Center</a></td>
          <td style="color:#1D4033;font-size:11px;">&middot;</td>
          <td style="padding:0 10px;"><a href="#" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Privacy Policy</a></td>
          <td style="color:#1D4033;font-size:11px;">&middot;</td>
          <td style="padding:0 10px;"><a href="#" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Terms</a></td>
        </tr>
      </table>
      <p style="margin:0;font-size:11px;color:rgba(77,122,99,0.55);line-height:1.6;">
        &copy; 2026 Zyro Technologies &middot; Karachi, Pakistan<br>
        You received this because someone signed up using this email address.
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`,
        });

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
