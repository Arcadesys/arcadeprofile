'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary. Active when the root layout itself crashes, so it
 * must own its own <html>/<body>. Anything more ambitious (e.g. shared
 * styling) belongs in route-group error.tsx files instead — those still
 * inherit the layout.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error('Root layout error:', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '4rem 1.5rem',
          maxWidth: '40rem',
          margin: '0 auto',
          color: '#111',
          background: '#fff',
        }}
      >
        <h1>Something went wrong.</h1>
        <p>
          An unexpected error prevented the page from rendering. Please refresh,
          or come back in a moment.
        </p>
      </body>
    </html>
  );
}
