'use client';

import { useId, useState } from 'react';

type Variant = 'default' | 'compact';

interface SubscribeCTAProps {
  variant?: Variant;
  eyebrow?: string;
  heading?: string;
  blurb?: string;
  buttonLabel?: string;
}

const SHARE_URL = 'https://thearcades.me';
const SHARE_TEXT = 'Serialized fiction in your inbox, Mon/Wed/Fri. Subscribe to The Arcades:';

export default function SubscribeCTA({
  variant = 'default',
  eyebrow = 'Fiction by email',
  heading = 'Read it as it arrives',
  blurb = 'Monday, Wednesday, Friday — one installment at a time, straight to your inbox.',
  buttonLabel = 'Start reading',
}: SubscribeCTAProps) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

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

  async function handleShare() {
    const shareData = { title: 'The Arcades', text: SHARE_TEXT, url: SHARE_URL };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share unsupported — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2400);
    } catch {
      // clipboard unavailable — silent
    }
  }

  const isCompact = variant === 'compact';
  const padding = isCompact ? '1.25rem' : '1.75rem';
  const margin = isCompact ? '0' : '3rem 0 0';

  return (
    <aside style={{
      margin,
      padding,
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '12px',
    }}>
      {!isCompact && (
        <p style={{
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          color: 'var(--neon-pink)',
          textTransform: 'uppercase',
          margin: '0 0 0.5rem',
        }}>
          {eyebrow}
        </p>
      )}
      <h2 style={{
        fontSize: isCompact ? '1.05rem' : '1.15rem',
        margin: '0 0 0.5rem',
        lineHeight: 1.3,
      }}>
        {heading}
      </h2>
      <p style={{
        fontSize: isCompact ? '0.85rem' : '0.88rem',
        color: 'var(--fg-muted)',
        margin: '0 0 1rem',
        lineHeight: 1.6,
      }}>
        {blurb}
      </p>

      {status === 'success' ? (
        <div>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--neon-pink)',
            fontFamily: 'var(--font-mono)',
            margin: '0 0 0.75rem',
          }}>
            ✓ You&apos;re in. First installment is on its way.
          </p>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--fg-muted)',
            margin: '0 0 0.85rem',
            lineHeight: 1.55,
          }}>
            Best way to thank me: send this to one person who still reads.
          </p>
          <button
            type="button"
            onClick={handleShare}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: 'var(--neon-pink)',
              border: '1px solid var(--neon-pink)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            {shareState === 'copied' ? '✓ Link copied' : 'Share The Arcades'}
          </button>
          <span
            role="status"
            aria-live="polite"
            style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
          >
            {shareState === 'copied' ? 'Link copied to clipboard' : ''}
          </span>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label htmlFor={inputId} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
              Your email address
            </label>
            <input
              id={inputId}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="reader@somewhere.good"
              required
              autoComplete="email"
              inputMode="email"
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
              {status === 'loading' ? 'Subscribing…' : buttonLabel}
            </button>
            {status === 'error' && (
              <p style={{ width: '100%', margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--neon-pink)' }}>
                {errorMsg}
              </p>
            )}
          </form>
          <p style={{
            margin: '0.85rem 0 0',
            fontSize: '0.75rem',
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}>
            No spam. Unsubscribe in one click. Prefer RSS?{' '}
            <a href="/feed.xml" style={{ color: 'var(--neon-pink)' }}>
              Grab the feed
            </a>.
          </p>
        </>
      )}
    </aside>
  );
}
