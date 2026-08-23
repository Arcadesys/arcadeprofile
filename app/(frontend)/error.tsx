'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log on the client so it lands in browser devtools and Vercel's
    // client-side error reporting. The server already logs the original
    // exception via Next.js — this is just for visibility on the user side.
    console.error('Page error:', error.digest ?? error.message);
  }, [error]);

  return (
    <main style={{ padding: '4rem 1.5rem', maxWidth: '40rem', margin: '0 auto' }}>
      <h1>Something went wrong.</h1>
      <p>
        An unexpected error occurred while rendering this page. The team has been
        notified. You can retry, or head{' '}
        <Link href="/" style={{ textDecoration: 'underline' }}>
          back home
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: '1.5rem',
          padding: '0.5rem 1rem',
          border: '1px solid currentColor',
          borderRadius: '0.375rem',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </main>
  );
}
