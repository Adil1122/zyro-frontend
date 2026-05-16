import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleAdsCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Redirect back to marketing page with error
      router.push(`/marketing?error=${encodeURIComponent(error)}`);
      return;
    }

    if (code && state) {
      // Process the OAuth callback
      fetch('/api/google-ads/callback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        if (response.ok) {
          // Success - redirect to marketing page
          router.push('/marketing?google_ads_connected=true');
        } else {
          // Error - redirect with error message
          router.push('/marketing?error=google_callback_failed');
        }
      })
      .catch(error => {
        console.error('Google Ads callback error:', error);
        router.push('/marketing?error=google_callback_error');
      });
    } else {
      // Missing parameters
      router.push('/marketing?error=missing_parameters');
    }
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #4285F4',
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',
          margin: '0 0 8px'
        }}>
          Connecting to Google Ads
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: '0',
          lineHeight: '1.5'
        }}>
          Please wait while we complete the authentication process...
        </p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
