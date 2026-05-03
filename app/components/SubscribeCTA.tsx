'use client';

import { useState } from 'react';

export default function SubscribeCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  return (
    <aside style={{
      margin: '3rem 0 0',
      padding: '1.75rem',
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '12px',
    }}>
      <p style={{
        fontSize: '0.7rem',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.1em',
        color: 'var(--neon-pink)',
        textTransform: 'uppercase',
        margin: '0 0 0.5rem',
      }}>
        Fiction by email
      </p>
      <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
        Read it as it arrives
      </h2>
      <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
        Monday, Wednesday, Friday — one installment at a time, straight to your inbox.
      </p>

      {status === 'success' ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--neon-pink)', fontFamily: 'var(--font-mono)' }}>
          ✓ You&apos;re in. Talk soon.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={status === 'loading'}
            className="flex-1 min-w-0"
            style={{
              padding: '0.55rem 0.85rem',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--fg)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '0.55rem 1.25rem',
              background: 'var(--neon-pink)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: status === 'loading' ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
          {status === 'error' && (
            <p style={{ width: '100%', margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--neon-pink)' }}>
              {errorMsg}
            </p>
          )}
        </form>
      )}
    </aside>
  );
}
