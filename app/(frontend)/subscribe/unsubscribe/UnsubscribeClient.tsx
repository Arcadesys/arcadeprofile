'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type State = 'loading' | 'ready' | 'working' | 'done' | 'error';

export default function UnsubscribeClient() {
  const [token, setToken] = useState('');
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('Reading the unsubscribe link…');
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname);
    // The server verifies the HMAC. Here only bound the size and avoid
    // reimplementing token syntax in browser code.
    if (fragment.length > 0 && fragment.length <= 256) {
      setToken(fragment);
      setState('ready');
      setMessage('Use the button below to unsubscribe this address from The Arcades email.');
    } else {
      setState('error');
      setMessage('This unsubscribe link is missing or invalid. Please contact the site owner for help.');
    }
  }, []);

  async function unsubscribe() {
    setState('working');
    setMessage('Unsubscribing…');
    try {
      const response = await fetch('/api/subscribe/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await response.json() as { ok?: boolean };
      if (!response.ok || !body.ok) throw new Error('Unsubscribe could not be completed. Please retry.');
      setState('done');
      setMessage('This address is unsubscribed from The Arcades email.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unsubscribe could not be completed. Please retry.');
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <main className="signup-verify" aria-labelledby="unsubscribe-title">
      <p className="signup-verify__eyebrow">The Arcades</p>
      <h1 id="unsubscribe-title">Unsubscribe from writing emails</h1>
      <p>This page will not change your email preferences until you choose the button below.</p>
      {state === 'ready' || state === 'working' ? (
        <div className="signup-verify__actions">
          <button type="button" disabled={state === 'working'} onClick={() => void unsubscribe()}>
            {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe this address'}
          </button>
        </div>
      ) : null}
      <div ref={statusRef} className="signup-verify__status" role={state === 'error' ? 'alert' : 'status'} aria-live={state === 'error' ? 'assertive' : 'polite'} tabIndex={-1}>{message}</div>
      <p><Link href="/writing">Return to The Arcades</Link></p>
    </main>
  );
}
