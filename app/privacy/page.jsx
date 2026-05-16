import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#333'
    }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        marginBottom: '24px',
        color: '#1a1a1a'
      }}>
        Privacy Policy
      </h1>
      
      <p style={{ 
        fontSize: '14px', 
        color: '#666', 
        marginBottom: '32px',
        fontStyle: 'italic'
      }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Introduction
        </h2>
        <p style={{ marginBottom: '16px' }}>
          Welcome to Zyro. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our marketing intelligence services.
        </p>
        <p>
          By using Zyro, you consent to the data practices described in this policy. If you do not agree with the terms of this privacy policy, please do not access or use our website.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Information We Collect
        </h2>
        
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#333'
        }}>
          Personal Information
        </h3>
        <p style={{ marginBottom: '16px' }}>
          We may collect personally identifiable information, such as:
        </p>
        <ul style={{ marginBottom: '24px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Name and email address</li>
          <li style={{ marginBottom: '8px' }}>Phone number</li>
          <li style={{ marginBottom: '8px' }}>Business information</li>
          <li style={{ marginBottom: '8px' }}>Marketing platform credentials (stored securely)</li>
        </ul>

        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#333'
        }}>
          Marketing Data
        </h3>
        <p style={{ marginBottom: '16px' }}>
          When you connect marketing platforms, we collect:
        </p>
        <ul style={{ marginBottom: '24px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Campaign performance data</li>
          <li style={{ marginBottom: '8px' }}>Advertising spend and revenue metrics</li>
          <li style={{ marginBottom: '8px' }}>Conversion and click data</li>
          <li style={{ marginBottom: '8px' }}>UTM parameters and attribution data</li>
        </ul>

        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#333'
        }}>
          Technical Data
        </h3>
        <p style={{ marginBottom: '16px' }}>
          We automatically collect certain technical information:
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>IP address and browser type</li>
          <li style={{ marginBottom: '8px' }}>Device information and operating system</li>
          <li style={{ marginBottom: '8px' }}>Pages visited and time spent</li>
          <li style={{ marginBottom: '8px' }}>Referring source and UTM parameters</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          How We Use Your Information
        </h2>
        <p style={{ marginBottom: '16px' }}>
          We use the collected information for various purposes:
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>To provide and maintain our marketing intelligence service</li>
          <li style={{ marginBottom: '8px' }}>To process and analyze marketing campaign data</li>
          <li style={{ marginBottom: '8px' }}>To calculate ROAS and other performance metrics</li>
          <li style={{ marginBottom: '8px' }}>To track UTM parameters for attribution</li>
          <li style={{ marginBottom: '8px' }}>To communicate with you about your account</li>
          <li style={{ marginBottom: '8px' }}>To improve our services and user experience</li>
          <li style={{ marginBottom: '8px' }}>To ensure security and prevent fraud</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Third-Party Integrations
        </h2>
        <p style={{ marginBottom: '16px' }}>
          Our service integrates with third-party marketing platforms:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Meta Ads (Facebook & Instagram)</strong>: Campaign data, ad account information</li>
          <li style={{ marginBottom: '8px' }}><strong>Google Ads</strong>: Campaign metrics, conversion data, GAQL queries</li>
        </ul>
        <p>
          These integrations require your explicit consent and API credentials. We only access data necessary for providing our analytics services.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Data Security
        </h2>
        <p style={{ marginBottom: '16px' }}>
          We implement appropriate security measures to protect your information:
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>API credentials are encrypted in our database</li>
          <li style={{ marginBottom: '8px' }}>Secure OAuth authentication flows</li>
          <li style={{ marginBottom: '8px' }}>Regular security audits and updates</li>
          <li style={{ marginBottom: '8px' }}>Access controls and authentication systems</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Cookies and Tracking
        </h2>
        <p style={{ marginBottom: '16px' }}>
          We use cookies and similar tracking technologies:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Essential cookies for website functionality</li>
          <li style={{ marginBottom: '8px' }}>Authentication cookies for user sessions</li>
          <li style={{ marginBottom: '8px' }}>UTM parameter storage for attribution</li>
        </ul>
        <p>
          You can control cookie settings through your browser preferences.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Data Retention
        </h2>
        <p>
          We retain your information only as long as necessary to provide our services and comply with legal obligations. You can request deletion of your account and associated data at any time.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Your Rights
        </h2>
        <p style={{ marginBottom: '16px' }}>
          You have the right to:
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Access your personal information</li>
          <li style={{ marginBottom: '8px' }}>Correct inaccurate information</li>
          <li style={{ marginBottom: '8px' }}>Delete your account and data</li>
          <li style={{ marginBottom: '8px' }}>Opt-out of marketing communications</li>
          <li style={{ marginBottom: '8px' }}>Data portability</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Children's Privacy
        </h2>
        <p>
          Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Changes to This Policy
        </h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Contact Us
        </h2>
        <p style={{ marginBottom: '16px' }}>
          If you have any questions about this Privacy Policy, please contact us:
        </p>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{ margin: '0 0 8px 0' }}><strong>Email:</strong> privacy@zyro.com</p>
          <p style={{ margin: '0 0 8px 0' }}><strong>Website:</strong> https://zyro.com</p>
          <p style={{ margin: 0 }}><strong>Address:</strong> [Your Business Address]</p>
        </div>
      </section>

      <div style={{ 
        marginTop: '48px', 
        paddingTop: '24px', 
        borderTop: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>
          This privacy policy is effective as of {new Date().toLocaleDateString()} and will govern our relationship with respect to the use of your personal information.
        </p>
      </div>
    </div>
  );
}
