'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AnalyticsTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log initialization
    console.log('Analytics test page loaded');
    addLog('Page loaded - checking analytics initialization');

    // Test localStorage access
    try {
      localStorage.setItem('analytics-test', 'test-value');
      const value = localStorage.getItem('analytics-test');
      addLog(`LocalStorage test: ${value === 'test-value' ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`LocalStorage error: ${errorMessage}`);
      addLog(`LocalStorage test: FAILED - ${errorMessage}`);
    }

    // Override console.log to capture analytics logs
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      if (args[0] === 'Vercel Analytics initialized' || 
          (typeof args[0] === 'string' && 
           (args[0].includes('Analytics') || args[0].includes('vitals')))) {
        addLog(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
      }
    };

    // Override console.error to capture errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      if (args[0] === 'Storage-related error:' || 
          (typeof args[0] === 'string' && args[0].includes('storage'))) {
        setError(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
      }
    };

    return () => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  // Helper function to add logs
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  // Simulate a page view event
  const triggerPageView = () => {
    addLog('Manually triggering page view event');
    // This will cause Next.js to log a route change which should trigger analytics
    window.history.pushState({}, '', window.location.pathname + '?t=' + Date.now());
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Vercel Analytics Test Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p>This page helps test if Vercel Analytics is working correctly.</p>
        <p>Check your browser console for detailed logs.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={triggerPageView}
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--accent-color)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Trigger Page View Event
          </button>
          
          <Link 
            href="/"
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--foreground-color)', 
              color: 'var(--text-color)', 
              border: '1px solid var(--accent-color)', 
              borderRadius: '4px',
              textDecoration: 'none'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 0, 0, 0.1)', 
          border: '1px solid red',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h3>Error Detected:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error}</pre>
        </div>
      )}
      
      <div style={{ 
        padding: '1rem', 
        background: 'var(--foreground-color)', 
        border: '1px solid var(--accent-color)',
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3>Analytics Logs:</h3>
        {logs.length === 0 ? (
          <p>No logs yet...</p>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {logs.join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
} 