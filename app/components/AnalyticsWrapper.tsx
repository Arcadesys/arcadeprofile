'use client';

import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';

export default function AnalyticsWrapper() {
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Vercel Analytics initialized');
    
    // Create a proxy for the original sendBeacon method to log analytics events
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
      if (url.includes('vitals') || url.includes('analytics')) {
        console.log('Analytics data being sent to:', url);
        try {
          console.log('Data payload:', data ? JSON.parse(data.toString()) : 'No data');
        } catch (e) {
          console.log('Data payload (raw):', data);
        }
      }
      return originalSendBeacon.apply(this, arguments);
    };

    // Log any storage-related errors
    window.addEventListener('error', (event) => {
      if (event.message.includes('storage') || event.message.includes('localStorage')) {
        console.error('Storage-related error:', event.message);
        console.error('Error details:', event.error);
        setAnalyticsError(event.message);
      }
    });

    // Handle unhandled promise rejections (which might not trigger the error event)
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = event.reason?.message || String(event.reason);
      if (errorMessage.includes('storage') || errorMessage.includes('localStorage')) {
        console.error('Unhandled storage-related rejection:', errorMessage);
        setAnalyticsError(errorMessage);
      }
    });

    return () => {
      // Restore original sendBeacon when component unmounts
      navigator.sendBeacon = originalSendBeacon;
    };
  }, []);

  // If we detect an analytics error, log it but don't render the component
  if (analyticsError) {
    console.log(`Analytics disabled due to error: ${analyticsError}`);
    return null;
  }

  // Wrap the Analytics component in a try-catch to prevent it from breaking the app
  try {
    return <Analytics debug={true} />;
  } catch (error) {
    console.error('Error rendering Analytics component:', error);
    return null;
  }
} 