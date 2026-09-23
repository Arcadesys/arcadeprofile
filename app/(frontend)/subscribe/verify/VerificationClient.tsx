'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Outcome = 'ready' | 'working' | 'complete' | 'awaiting-kit' | 'cancelled' | 'error' | 'missing';

export default function VerificationClient() {
  const [token, setToken] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('ready');
  const [message, setMessage] = useState('Nothing happens until you choose to confirm. If you did not request this email, you can close this page.');
  const statusRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const fragment = window.location.hash.slice(1);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (fragment) {
      setToken(fragment);
      setOutcome('ready');
      setMessage('Choose Confirm subscription if you want the emails named in the message we sent you.');
    } else {
      setOutcome('missing');
      setMessage('This confirmation link is missing. Return to signup to request a new one.');
    }
  }, []);

  useEffect(() => {
    if (['complete', 'awaiting-kit', 'cancelled', 'error'].includes(outcome)) statusRef.current?.focus();
  }, [outcome]);

  async function submit(action: 'confirm' | 'cancel') {
    const submittedToken = token || window.location.hash.slice(1);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (!submittedToken) {
      setOutcome('error');
      setMessage('This confirmation link is missing. Return to signup to request a new one.');
      return;
    }
    setOutcome('working');
    setMessage(action === 'confirm' ? 'Confirming your subscription…' : 'Cancelling this request…');
    try {
      const response = await fetch('/api/subscribe/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: submittedToken, action }),
        cache: 'no-store',
      });
      const body = await response.json() as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || 'Could not process this link.');
      setToken('');
      if (action === 'cancel' || body.status === 'cancelled') {
        setOutcome('cancelled');
        setMessage('This signup request was cancelled. No emails were added.');
      } else if (body.status === 'awaiting-kit') {
        setOutcome('awaiting-kit');
        setMessage('Your request is confirmed. If your address is new or inactive in Kit, Kit may send one more confirmation before emails begin.');
      } else {
        setOutcome('complete');
        setMessage('You are subscribed to the emails you chose. You can unsubscribe from any email.');
      }
    } catch (cause) {
      setOutcome('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not process this link. Please try again.');
    }
  }

  return (
    <main className="signup-verify" aria-labelledby="verify-title">
      <p className="signup-verify__eyebrow">The Arcades</p>
      <h1 id="verify-title">Confirm your subscription</h1>
      <p>The email we sent lists exactly what you signed up for. Confirm below to get those emails. Kit may ask you to confirm once more before delivery begins.</p>
      {!['complete', 'awaiting-kit', 'cancelled', 'error', 'missing'].includes(outcome) ? (
        <div className="signup-verify__actions">
          <button type="button" disabled={outcome === 'working'} onClick={() => void submit('confirm')}>Confirm subscription</button>
          <button type="button" className="signup-verify__secondary" disabled={outcome === 'working'} onClick={() => void submit('cancel')}>Cancel this request</button>
        </div>
      ) : null}
      <div ref={statusRef} className="signup-verify__status" role={outcome === 'error' ? 'alert' : 'status'} aria-live={outcome === 'error' ? 'assertive' : 'polite'} tabIndex={-1}>{message}</div>
      <p><Link href="/subscribe">Return to signup</Link></p>
    </main>
  );
}
