'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Outcome = 'ready' | 'working' | 'complete' | 'awaiting-kit' | 'cancelled' | 'error' | 'missing';

export default function VerificationClient() {
  const [token, setToken] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('ready');
  const [message, setMessage] = useState('This page does not confirm a signup automatically. Choose Confirm only if you requested this email.');
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (fragment) {
      setToken(fragment);
      setOutcome('ready');
      setMessage('Choose Confirm preferences to finish your request.');
    } else {
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
    setMessage(action === 'confirm' ? 'Confirming your preferences…' : 'Cancelling this request…');
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
        setMessage('This signup request was cancelled. No preferences were added.');
      } else if (body.status === 'awaiting-kit') {
        setOutcome('awaiting-kit');
        setMessage('Your choices are confirmed. If Kit considers your address new or inactive, it may send another confirmation before delivery begins.');
      } else {
        setOutcome('complete');
        setMessage('Your selected writing preferences are confirmed. You can unsubscribe from any email.');
      }
    } catch (cause) {
      setOutcome('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not process this link. Please try again.');
    }
  }

  return (
    <main className="signup-verify" aria-labelledby="verify-title">
      <p className="signup-verify__eyebrow">The Arcades</p>
      <h1 id="verify-title">Confirm your writing preferences</h1>
      <p>One confirmation covers every preference you selected. If you are new or inactive in Kit, Kit may also send a confirmation before your subscription starts.</p>
      {!['complete', 'awaiting-kit', 'cancelled', 'error'].includes(outcome) ? (
        <div className="signup-verify__actions">
          <button type="button" disabled={outcome === 'working'} onClick={() => void submit('confirm')}>Confirm preferences</button>
          <button type="button" className="signup-verify__secondary" disabled={outcome === 'working'} onClick={() => void submit('cancel')}>Cancel this request</button>
        </div>
      ) : null}
      <div ref={statusRef} className="signup-verify__status" role={outcome === 'error' ? 'alert' : 'status'} aria-live={outcome === 'error' ? 'assertive' : 'polite'} tabIndex={-1}>{message}</div>
      <p><Link href="/subscribe">Return to signup</Link></p>
    </main>
  );
}
