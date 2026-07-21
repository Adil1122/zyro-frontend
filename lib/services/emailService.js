import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL || 'Zyro <info@zyroocloud.com>';

function getResend() {
    return new Resend(process.env.RESEND_API_KEY);
}

// ─── Shared layout ─────────────────────────────────────────────────────────

function layout(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#060F0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060F0B;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;border-radius:18px;overflow:hidden;border:1px solid rgba(92,168,124,0.25);">

    <!-- HEADER -->
    <tr><td style="background:linear-gradient(160deg,#132C1F 0%,#1D4033 100%);padding:30px 40px 26px;text-align:center;border-bottom:1px solid rgba(92,168,124,0.2);">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:9px;text-align:center;line-height:34px;font-size:17px;">&#x2B22;</div>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:900;color:#F0FDF4;letter-spacing:-0.02em;">Zyro</span>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;color:#A7F3D0;margin-top:8px;letter-spacing:0.06em;opacity:0.7;">Smart Business Dashboard &middot; Pakistan</div>
    </td></tr>

    <!-- BODY -->
    <tr><td style="background:#0D2119;padding:36px 40px 32px;">
      ${bodyHtml}
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#0A1912;border-top:1px solid rgba(92,168,124,0.1);padding:20px 40px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
        <tr>
          <td style="padding:0 10px;"><a href="https://www.zyroocloud.com" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Dashboard</a></td>
          <td style="color:#1D4033;font-size:11px;">&middot;</td>
          <td style="padding:0 10px;"><a href="https://www.zyroocloud.com/privacy" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Privacy</a></td>
          <td style="color:#1D4033;font-size:11px;">&middot;</td>
          <td style="padding:0 10px;"><a href="https://www.zyroocloud.com/terms" style="font-size:11px;color:#4D7A63;text-decoration:none;font-weight:500;">Terms</a></td>
        </tr>
      </table>
      <p style="margin:0;font-size:11px;color:rgba(77,122,99,0.55);line-height:1.6;">
        &copy; 2026 Zyro Technologies &middot; Karachi, Pakistan<br>
        You received this email because of your Zyro account.
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function badge(color, text) {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;background:${color}20;color:${color};border:1px solid ${color}50;">${text}</span>`;
}

// ─── Email Templates ────────────────────────────────────────────────────────

export const emailService = {

    // 1. OTP Verification
    async sendOTP(email, name, otp) {
        const digits = otp.split('');
        const digitHtml = digits.map(d =>
            `<td style="padding:0 4px;">
              <div style="width:46px;height:54px;background:#050D09;border:1.5px solid rgba(92,168,124,0.35);border-radius:10px;
                          text-align:center;line-height:54px;font-family:'Courier New',Courier,monospace;
                          font-size:26px;font-weight:800;color:#4ADE80;">${d}</div>
            </td>`
        ).join('');

        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${name || 'there'},</p>
          <h1 style="margin:0 0 14px;font-size:21px;font-weight:800;color:#F0FDF4;letter-spacing:-0.025em;">Verify your email address</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#A7F3D0;line-height:1.7;opacity:0.85;">
            Enter the code below in the signup page to confirm your email and continue setting up your account.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#050D09;border:1.5px solid rgba(92,168,124,0.32);border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:22px 0 18px;text-align:center;">
              <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#5CA87C;">&#x1F512; Verification Code</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>${digitHtml}</tr></table>
              <p style="margin:0;font-size:12px;color:#4D7A63;">Expires in 10 minutes</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;font-size:12px;color:#4D7A63;line-height:1.6;">
              &#x1F6E1;&nbsp; If you didn't request this, ignore this email. <strong style="color:#5CA87C;">Never share this code with anyone.</strong>
            </td></tr>
          </table>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `${otp} — your Zyro verification code`,
            html: layout('Zyro Email Verification', body),
        });
    },

    // 2. Welcome Email
    async sendWelcome(email, name, businessName) {
        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Welcome, ${name}!</p>
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#F0FDF4;letter-spacing:-0.025em;">Your Zyro account is ready &#x1F389;</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#A7F3D0;line-height:1.7;opacity:0.85;">
            ${businessName ? `<strong style="color:#F0FDF4;">${businessName}</strong> is now live on Zyro. ` : ''}
            Your smart business dashboard is ready — manage orders, inventory, customers, and couriers all in one place.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
                ['&#x1F4E6;', 'Orders', 'Track and manage all your orders across platforms'],
                ['&#x1F4CA;', 'Analytics', 'Real-time sales and performance insights'],
                ['&#x1F69A;', 'Couriers', 'PostEx, TCS, Leopards, M&P and more'],
                ['&#x1F4AC;', 'WhatsApp', 'Automated order confirmations to customers'],
            ].map(([icon, title, desc]) => `
            <tr><td style="padding:8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.1);border-radius:10px;">
                <tr>
                  <td style="padding:14px;font-size:22px;width:44px;">${icon}</td>
                  <td style="padding:14px 14px 14px 0;">
                    <div style="font-size:13px;font-weight:700;color:#F0FDF4;margin-bottom:2px;">${title}</div>
                    <div style="font-size:12px;color:#4D7A63;">${desc}</div>
                  </td>
                </tr>
              </table>
            </td></tr>`).join('')}
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:10px;padding:13px 32px;text-align:center;">
              <a href="https://www.zyroocloud.com" style="font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.02em;">Go to Dashboard &rarr;</a>
            </td></tr>
          </table>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `Welcome to Zyro, ${name}!`,
            html: layout('Welcome to Zyro', body),
        });
    },

    // 3. Order Confirmation (to customer)
    async sendOrderConfirmation(email, { customerName, orderNumber, items = [], total, currency = 'PKR' }) {
        const itemRows = items.map(item =>
            `<tr>
              <td style="padding:10px 0;font-size:13px;color:#A7F3D0;border-bottom:1px solid rgba(92,168,124,0.08);">${item.name}</td>
              <td style="padding:10px 0;font-size:13px;color:#A7F3D0;border-bottom:1px solid rgba(92,168,124,0.08);text-align:center;">x${item.quantity}</td>
              <td style="padding:10px 0;font-size:13px;color:#F0FDF4;border-bottom:1px solid rgba(92,168,124,0.08);text-align:right;">${currency} ${Number(item.price * item.quantity).toLocaleString()}</td>
            </tr>`
        ).join('');

        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${customerName},</p>
          <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#F0FDF4;">Order Confirmed &#x2705;</h1>
          <p style="margin:0 0 24px;font-size:13px;color:#4D7A63;">Order #${orderNumber}</p>
          ${items.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <th style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5CA87C;text-align:left;">Item</th>
              <th style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5CA87C;text-align:center;">Qty</th>
              <th style="padding:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5CA87C;text-align:right;">Price</th>
            </tr>
            ${itemRows}
            <tr>
              <td colspan="2" style="padding:12px 0 0;font-size:14px;font-weight:700;color:#F0FDF4;">Total</td>
              <td style="padding:12px 0 0;font-size:14px;font-weight:800;color:#4ADE80;text-align:right;">${currency} ${Number(total).toLocaleString()}</td>
            </tr>
          </table>` : `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.12);border-radius:10px;margin-bottom:20px;">
            <tr>
              <td style="padding:16px 20px;font-size:14px;color:#A7F3D0;">Order Total</td>
              <td style="padding:16px 20px;font-size:16px;font-weight:800;color:#4ADE80;text-align:right;">${currency} ${Number(total).toLocaleString()}</td>
            </tr>
          </table>`}
          <p style="margin:0;font-size:13px;color:#4D7A63;line-height:1.7;">We will notify you once your order is shipped. Thank you for your order!</p>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `Order #${orderNumber} confirmed — Zyro`,
            html: layout('Order Confirmed', body),
        });
    },

    // 4. Order Status Update (to customer)
    async sendOrderStatusUpdate(email, { customerName, orderNumber, status, currency = 'PKR', total }) {
        const statusConfig = {
            processing:  { color: '#3B82F6', label: 'Processing',  icon: '&#x23F3;', msg: 'Your payment has been received and your order is now being processed.' },
            shipped:     { color: '#F59E0B', label: 'Shipped',     icon: '&#x1F69A;', msg: 'Great news! Your order is on its way.' },
            completed:   { color: '#10B981', label: 'Delivered',   icon: '&#x2705;', msg: 'Your order has been delivered. We hope you love your purchase!' },
            cancelled:   { color: '#EF4444', label: 'Cancelled',   icon: '&#x274C;', msg: 'Your order has been cancelled. Contact us if this was a mistake.' },
            refunded:    { color: '#8B5CF6', label: 'Refunded',    icon: '&#x1F4B0;', msg: 'Your refund has been processed and will reflect within 3-5 business days.' },
        };
        const cfg = statusConfig[status?.toLowerCase()] || { color: '#6B7280', label: status, icon: '&#x1F4CB;', msg: `Your order status has been updated to ${status}.` };

        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${customerName},</p>
          <h1 style="margin:0 0 20px;font-size:21px;font-weight:800;color:#F0FDF4;">Order Update ${cfg.icon}</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.04);border:1px solid rgba(92,168,124,0.12);border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <div style="margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4D7A63;">Order #${orderNumber}</div>
              <div style="margin-bottom:12px;">${badge(cfg.color, cfg.label.toUpperCase())}</div>
              <p style="margin:0;font-size:14px;color:#A7F3D0;line-height:1.7;">${cfg.msg}</p>
              ${total ? `<div style="margin-top:12px;font-size:13px;color:#4D7A63;">Total: <strong style="color:#F0FDF4;">${currency} ${Number(total).toLocaleString()}</strong></div>` : ''}
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#4D7A63;">Questions? Reply to this email or visit your order history.</p>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `Order #${orderNumber} is ${cfg.label} — Zyro`,
            html: layout('Order Status Update', body),
        });
    },

    // 5. Password Reset
    async sendPasswordReset(email, name, resetLink) {
        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${name || 'there'},</p>
          <h1 style="margin:0 0 14px;font-size:21px;font-weight:800;color:#F0FDF4;">Reset your password</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#A7F3D0;line-height:1.7;opacity:0.85;">
            We received a request to reset your Zyro password. Click the button below — this link expires in <strong style="color:#F0FDF4;">1 hour</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:10px;padding:13px 32px;text-align:center;">
              <a href="${resetLink}" style="font-size:14px;font-weight:700;color:#fff;text-decoration:none;">Reset Password &rarr;</a>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;font-size:12px;color:#4D7A63;line-height:1.6;">
              &#x1F6E1;&nbsp; If you didn't request a password reset, ignore this email. Your password won't change.
            </td></tr>
          </table>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: 'Reset your Zyro password',
            html: layout('Reset Password', body),
        });
    },

    // 6. New Order Alert (to merchant)
    async sendMerchantNewOrderAlert(email, { merchantName, orderNumber, customerName, total, currency = 'PKR', items = [] }) {
        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${merchantName || 'there'},</p>
          <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#F0FDF4;">New Order Received &#x1F6D2;</h1>
          <p style="margin:0 0 24px;font-size:13px;color:#4D7A63;">Order #${orderNumber} from ${customerName}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.05);border:1px solid rgba(92,168,124,0.12);border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:16px 20px;font-size:13px;color:#A7F3D0;">Customer</td>
              <td style="padding:16px 20px;font-size:13px;font-weight:600;color:#F0FDF4;text-align:right;">${customerName}</td>
            </tr>
            <tr style="border-top:1px solid rgba(92,168,124,0.08);">
              <td style="padding:16px 20px;font-size:13px;color:#A7F3D0;">Items</td>
              <td style="padding:16px 20px;font-size:13px;font-weight:600;color:#F0FDF4;text-align:right;">${items.length > 0 ? items.map(i => i.name).join(', ') : '—'}</td>
            </tr>
            <tr style="border-top:1px solid rgba(92,168,124,0.08);">
              <td style="padding:16px 20px;font-size:14px;font-weight:700;color:#F0FDF4;">Total</td>
              <td style="padding:16px 20px;font-size:16px;font-weight:800;color:#4ADE80;text-align:right;">${currency} ${Number(total).toLocaleString()}</td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:10px;padding:13px 32px;text-align:center;">
              <a href="https://www.zyroocloud.com" style="font-size:14px;font-weight:700;color:#fff;text-decoration:none;">View in Dashboard &rarr;</a>
            </td></tr>
          </table>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `New order #${orderNumber} — ${currency} ${Number(total).toLocaleString()}`,
            html: layout('New Order Alert', body),
        });
    },

    // 7. Low Stock Alert (to merchant)
    async sendLowStockAlert(email, { merchantName, products = [] }) {
        const rows = products.map(p =>
            `<tr style="border-top:1px solid rgba(92,168,124,0.08);">
              <td style="padding:12px 20px;font-size:13px;color:#A7F3D0;">${p.name}</td>
              <td style="padding:12px 20px;font-size:13px;font-weight:700;color:${p.stock === 0 ? '#EF4444' : '#F59E0B'};text-align:right;">${p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}</td>
            </tr>`
        ).join('');

        const body = `
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#A7F3D0;">Hi ${merchantName || 'there'},</p>
          <h1 style="margin:0 0 14px;font-size:21px;font-weight:800;color:#F0FDF4;">Low Stock Alert &#x26A0;&#xFE0F;</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#A7F3D0;line-height:1.7;opacity:0.85;">
            The following products are running low. Restock soon to avoid missed orders.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(92,168,124,0.04);border:1px solid rgba(92,168,124,0.12);border-radius:12px;margin-bottom:24px;">
            <tr>
              <th style="padding:12px 20px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5CA87C;text-align:left;">Product</th>
              <th style="padding:12px 20px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5CA87C;text-align:right;">Stock</th>
            </tr>
            ${rows}
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:linear-gradient(135deg,#5CA87C,#3D8A5F);border-radius:10px;padding:13px 32px;text-align:center;">
              <a href="https://www.zyroocloud.com" style="font-size:14px;font-weight:700;color:#fff;text-decoration:none;">Manage Inventory &rarr;</a>
            </td></tr>
          </table>`;

        return getResend().emails.send({
            from: FROM,
            to: email,
            subject: `Low stock alert — ${products.length} product${products.length > 1 ? 's' : ''} need restocking`,
            html: layout('Low Stock Alert', body),
        });
    },
};
