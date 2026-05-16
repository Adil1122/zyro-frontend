"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function UTMTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Capture UTM parameters from URL
    const utmParams = {
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_term: searchParams.get('utm_term'),
      utm_content: searchParams.get('utm_content'),
      gclid: searchParams.get('gclid'), // Google Click Identifier
      fbclid: searchParams.get('fbclid'), // Facebook Click Identifier
    };

    // Store UTM parameters in localStorage for later use during checkout
    const hasUTMParams = Object.values(utmParams).some(param => param !== null);
    
    if (hasUTMParams) {
      localStorage.setItem('utm_params', JSON.stringify(utmParams));
      
      // Send tracking event to your analytics
      const trackingData = {
        event: 'utm_parameters_captured',
        utm_params: utmParams,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
      };

      // You can send this to your analytics endpoint
      fetch('/api/tracking/utm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      }).catch(console.error);
    }
  }, [searchParams]);

  // This component doesn't render anything visible
  return null;
}

// Hook to retrieve stored UTM parameters
export function useUTMParams() {
  useEffect(() => {
    const storedParams = localStorage.getItem('utm_params');
    if (storedParams) {
      try {
        return JSON.parse(storedParams);
      } catch (error) {
        console.error('Failed to parse UTM params:', error);
        return {};
      }
    }
    return {};
  }, []);
}

// Function to attach UTM params to order data
export function attachUTMToOrder(orderData) {
  const storedParams = localStorage.getItem('utm_params');
  if (storedParams) {
    try {
      const utmParams = JSON.parse(storedParams);
      return {
        ...orderData,
        ...utmParams
      };
    } catch (error) {
      console.error('Failed to attach UTM params to order:', error);
    }
  }
  return orderData;
}
