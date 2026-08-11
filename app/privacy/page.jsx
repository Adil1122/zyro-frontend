export const metadata = {
  title: 'Privacy Policy — Zyro Cloud',
  description: 'How Zyro Cloud collects, uses, and protects your data when you connect your Shopify, Daraz, or WooCommerce store.',
};

export default function PrivacyPolicy() {
  return (
    <>
      <style>{`
        :root {
          --pp-bg: #ffffff;
          --pp-bg-section: #f0fdf4;
          --pp-bg-card: #f8fafc;
          --pp-text: #0f172a;
          --pp-muted: #475569;
          --pp-faint: #94a3b8;
          --pp-accent: #10b981;
          --pp-accent-dim: rgba(16,185,129,0.12);
          --pp-border: #e2e8f0;
          --pp-heading: #0f172a;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --pp-bg: #0b0f1a;
            --pp-bg-section: #0d2218;
            --pp-bg-card: #111827;
            --pp-text: #e2e8f0;
            --pp-muted: #94a3b8;
            --pp-faint: #64748b;
            --pp-accent: #34d399;
            --pp-accent-dim: rgba(52,211,153,0.1);
            --pp-border: #1e2a3a;
            --pp-heading: #f1f5f9;
          }
        }
        :root[data-theme="dark"] {
          --pp-bg: #0b0f1a;
          --pp-bg-section: #0d2218;
          --pp-bg-card: #111827;
          --pp-text: #e2e8f0;
          --pp-muted: #94a3b8;
          --pp-faint: #64748b;
          --pp-accent: #34d399;
          --pp-accent-dim: rgba(52,211,153,0.1);
          --pp-border: #1e2a3a;
          --pp-heading: #f1f5f9;
        }
        :root[data-theme="light"] {
          --pp-bg: #ffffff;
          --pp-bg-section: #f0fdf4;
          --pp-bg-card: #f8fafc;
          --pp-text: #0f172a;
          --pp-muted: #475569;
          --pp-faint: #94a3b8;
          --pp-accent: #10b981;
          --pp-accent-dim: rgba(16,185,129,0.12);
          --pp-border: #e2e8f0;
          --pp-heading: #0f172a;
        }
        .pp-wrap {
          background: var(--pp-bg);
          color: var(--pp-text);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.75;
        }
        .pp-header {
          border-bottom: 1px solid var(--pp-border);
          padding: 18px 0;
          background: var(--pp-bg);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .pp-header-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pp-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .pp-logo-mark {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #fff;
          font-weight: 800;
        }
        .pp-logo-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--pp-heading);
          letter-spacing: -0.3px;
        }
        .pp-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--pp-faint);
          background: var(--pp-bg-card);
          border: 1px solid var(--pp-border);
          border-radius: 20px;
          padding: 3px 10px;
        }
        .pp-main {
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 24px 80px;
        }
        .pp-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--pp-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 14px;
        }
        .pp-main h1 {
          font-size: clamp(28px, 5vw, 38px);
          font-weight: 800;
          color: var(--pp-heading);
          letter-spacing: -0.6px;
          line-height: 1.2;
          margin-bottom: 16px;
        }
        .pp-meta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 48px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--pp-border);
          font-size: 13px;
          color: var(--pp-muted);
        }
        .pp-meta strong { color: var(--pp-text); font-weight: 600; }
        .pp-section { margin-bottom: 44px; }
        .pp-section h2 {
          font-size: 19px;
          font-weight: 700;
          color: var(--pp-heading);
          letter-spacing: -0.3px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pp-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: var(--pp-accent-dim);
          color: var(--pp-accent);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pp-section h3 {
          font-size: 13px;
          font-weight: 700;
          color: var(--pp-heading);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 20px;
          margin-bottom: 8px;
        }
        .pp-section p {
          color: var(--pp-muted);
          margin-bottom: 14px;
        }
        .pp-section p:last-child { margin-bottom: 0; }
        .pp-section ul, .pp-section ol {
          padding-left: 20px;
          color: var(--pp-muted);
          margin-bottom: 14px;
        }
        .pp-section li { margin-bottom: 6px; }
        .pp-section li:last-child { margin-bottom: 0; }
        .pp-highlight {
          background: var(--pp-accent-dim);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 10px;
          padding: 16px 20px;
          margin-top: 16px;
          font-size: 14px;
          color: var(--pp-text);
        }
        .pp-platforms {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .pp-platform {
          background: var(--pp-bg-card);
          border: 1px solid var(--pp-border);
          border-radius: 8px;
          padding: 12px 14px;
        }
        .pp-platform-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--pp-heading);
          margin-bottom: 3px;
        }
        .pp-platform-desc {
          font-size: 12px;
          color: var(--pp-faint);
          line-height: 1.5;
        }
        .pp-contact-box {
          background: var(--pp-bg-section);
          border: 1px solid var(--pp-border);
          border-radius: 10px;
          padding: 24px;
          margin-top: 16px;
        }
        .pp-contact-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .pp-contact-row:last-child { margin-bottom: 0; }
        .pp-contact-label {
          font-weight: 600;
          color: var(--pp-text);
          min-width: 70px;
          flex-shrink: 0;
        }
        .pp-contact-value { color: var(--pp-muted); }
        .pp-contact-value a { color: var(--pp-accent); text-decoration: none; }
        .pp-footer {
          margin-top: 64px;
          padding-top: 24px;
          border-top: 1px solid var(--pp-border);
          font-size: 13px;
          color: var(--pp-faint);
          line-height: 1.6;
        }
      `}</style>

      <div className="pp-wrap">
        <header className="pp-header">
          <div className="pp-header-inner">
            <a href="https://www.zyroocloud.com" className="pp-logo">
              <div className="pp-logo-mark">Z</div>
              <span className="pp-logo-name">Zyro Cloud</span>
            </a>
            <span className="pp-badge">Legal</span>
          </div>
        </header>

        <main className="pp-main">
          <div className="pp-eyebrow">Legal</div>
          <h1>Privacy Policy</h1>

          <div className="pp-meta">
            <span><strong>Effective date:</strong> August 11, 2026</span>
            <span><strong>Last updated:</strong> August 11, 2026</span>
            <span><strong>Applies to:</strong> zyroocloud.com</span>
          </div>

          <section className="pp-section">
            <h2><span className="pp-num">1</span>Introduction</h2>
            <p>
              Zyro Cloud (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates <strong>zyroocloud.com</strong>, an
              e-commerce management dashboard that helps sellers manage orders, products, customers, and
              analytics across multiple sales platforms including Shopify, Daraz, and WooCommerce.
            </p>
            <p>
              This Privacy Policy explains what information we collect, how we use it, and your rights
              regarding your data. By using Zyro Cloud, you agree to the practices described here.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">2</span>Information We Collect</h2>

            <h3>Account Information</h3>
            <ul>
              <li>Name and email address when you sign up</li>
              <li>Password (stored as a hashed, non-reversible value)</li>
              <li>Subscription and billing plan details</li>
            </ul>

            <h3>Store Integration Data</h3>
            <p>
              When you connect a sales platform, we store the API credentials (access tokens) required to
              communicate with that platform on your behalf. These tokens are stored securely and used only
              to retrieve your store data.
            </p>
            <ul>
              <li><strong>Shopify:</strong> Store domain, OAuth access token, orders, products, customers, fulfillments</li>
              <li><strong>Daraz:</strong> Access token, region, orders and order items</li>
              <li><strong>WooCommerce:</strong> Store URL, consumer key and secret, orders and products</li>
            </ul>

            <h3>Payment Configuration</h3>
            <p>
              If you configure payment gateway integrations (JazzCash, EasyPaisa, bank transfer), we store
              only the configuration details you provide (merchant IDs, API keys). We do not store cardholder
              data or process payments on your behalf.
            </p>

            <h3>Usage Data</h3>
            <ul>
              <li>Pages visited and features used within the dashboard</li>
              <li>Browser type, device, and IP address</li>
              <li>Session duration and interaction logs</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">3</span>How We Use Your Information</h2>
            <ul>
              <li>To authenticate you and maintain your account session</li>
              <li>To connect to your sales platforms and retrieve your store data (orders, products, customers) for display in your dashboard</li>
              <li>To calculate analytics, revenue summaries, and performance metrics</li>
              <li>To sync orders and customers to your Zyro database for offline access and reporting</li>
              <li>To send account notifications, password reset emails, and subscription updates</li>
              <li>To improve the reliability and features of our service</li>
              <li>To detect and prevent fraud or unauthorized access</li>
            </ul>
            <div className="pp-highlight">
              We never sell your data or use your store&rsquo;s order and customer data for advertising,
              profiling, or any purpose other than providing your dashboard.
            </div>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">4</span>Shopify Data Use</h2>
            <p>
              When you install Zyro Cloud on your Shopify store, we access your store data through the
              Shopify Admin API with your explicit authorization. Specifically, we access:
            </p>
            <ul>
              <li><strong>Orders</strong> — to display order history, statuses, and revenue analytics</li>
              <li><strong>Products</strong> — to show product listings and inventory levels</li>
              <li><strong>Customers</strong> — to display customer information linked to orders</li>
              <li><strong>Fulfillments</strong> — to show delivery and fulfillment status</li>
            </ul>
            <p>
              This data is displayed only within your private dashboard. It is not shared with any third
              party, not used for advertising, and not merged with data from other merchants.
            </p>
            <p>
              You can disconnect your Shopify store at any time from <strong>Settings → Stores → Shopify → Disconnect</strong>,
              which will remove your access token and stop all data access immediately.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">5</span>Connected Platforms</h2>
            <p>
              Zyro Cloud integrates with the following platforms. Each integration requires your explicit
              consent and stores only the credentials you provide.
            </p>
            <div className="pp-platforms">
              <div className="pp-platform">
                <div className="pp-platform-name">Shopify</div>
                <div className="pp-platform-desc">Orders, products, customers via OAuth</div>
              </div>
              <div className="pp-platform">
                <div className="pp-platform-name">Daraz</div>
                <div className="pp-platform-desc">Orders and items via Open Platform API</div>
              </div>
              <div className="pp-platform">
                <div className="pp-platform-name">WooCommerce</div>
                <div className="pp-platform-desc">Orders and products via REST API</div>
              </div>
              <div className="pp-platform">
                <div className="pp-platform-name">WhatsApp Business</div>
                <div className="pp-platform-desc">Message automation via Cloud API</div>
              </div>
              <div className="pp-platform">
                <div className="pp-platform-name">Google Ads</div>
                <div className="pp-platform-desc">Campaign analytics via OAuth</div>
              </div>
              <div className="pp-platform">
                <div className="pp-platform-name">Stripe</div>
                <div className="pp-platform-desc">Payment processing via API key</div>
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">6</span>Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We share data
              only in these limited circumstances:
            </p>
            <ul>
              <li>
                <strong>Service providers:</strong> Supabase (database hosting), Vercel (application
                hosting). These providers process data on our behalf under strict confidentiality agreements.
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law, court order, or to protect our
                legal rights.
              </li>
              <li>
                <strong>Business transfer:</strong> In the event of a merger or acquisition, your data may
                transfer to the new entity under the same privacy terms.
              </li>
            </ul>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">7</span>Data Security</h2>
            <ul>
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>API access tokens are stored encrypted in our database</li>
              <li>Passwords are hashed using industry-standard algorithms and never stored in plain text</li>
              <li>Database access is restricted to authorized application services only</li>
              <li>We conduct regular security reviews of our infrastructure</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">8</span>Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Store data (orders,
              products, customers synced from your platforms) is retained to power your dashboard analytics.
            </p>
            <p>
              When you disconnect a platform integration, its access credentials are deleted immediately.
              When you delete your account, all associated data is permanently removed within 30 days.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">9</span>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correct</strong> — update or correct inaccurate information in your account</li>
              <li><strong>Delete</strong> — request deletion of your account and all associated data</li>
              <li><strong>Disconnect</strong> — revoke platform integrations at any time from your settings</li>
              <li><strong>Portability</strong> — request an export of your data in a machine-readable format</li>
              <li><strong>Object</strong> — object to certain uses of your data</li>
            </ul>
            <p>To exercise any of these rights, contact us at the email below. We will respond within 30 days.</p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">10</span>Cookies</h2>
            <p>
              We use cookies and session tokens solely for authentication and to maintain your logged-in
              session. We do not use third-party advertising cookies or cross-site tracking.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">11</span>Children&rsquo;s Privacy</h2>
            <p>
              Zyro Cloud is a business tool not intended for use by anyone under 18. We do not knowingly
              collect personal information from minors.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">12</span>Changes to This Policy</h2>
            <p>
              We may update this policy as our service evolves. Material changes will be communicated via
              email or a notice in the dashboard. Continued use after changes are posted constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section className="pp-section">
            <h2><span className="pp-num">13</span>Contact Us</h2>
            <p>For privacy questions, data requests, or to report a concern:</p>
            <div className="pp-contact-box">
              <div className="pp-contact-row">
                <span className="pp-contact-label">Email</span>
                <span className="pp-contact-value">
                  <a href="mailto:ahmadfarooq5581@gmail.com">ahmadfarooq5581@gmail.com</a>
                </span>
              </div>
              <div className="pp-contact-row">
                <span className="pp-contact-label">Website</span>
                <span className="pp-contact-value">
                  <a href="https://www.zyroocloud.com">www.zyroocloud.com</a>
                </span>
              </div>
              <div className="pp-contact-row">
                <span className="pp-contact-label">Response</span>
                <span className="pp-contact-value">Within 30 days of receiving your request</span>
              </div>
            </div>
          </section>

          <div className="pp-footer">
            <p>
              This Privacy Policy is effective as of August 11, 2026. Zyro Cloud is operated
              independently and is not affiliated with Shopify Inc., Daraz, or any connected platform.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
