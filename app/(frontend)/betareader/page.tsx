'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BetaReader() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to Google Form
    window.location.href = 'https://docs.google.com/forms/d/e/1FAIpQLSeOpGMaOMJwCqu9WHUpJvjlYvRIgV6vC3BqdstVJvssPlWeqg/viewform?usp=dialog';
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1>Redirecting to Beta Reader Form...</h1>
      <p>If you are not redirected automatically, please <a href="https://docs.google.com/forms/d/e/1FAIpQLSeOpGMaOMJwCqu9WHUpJvjlYvRIgV6vC3BqdstVJvssPlWeqg/viewform?usp=dialog">click here</a>.</p>
    </div>
  );
} 