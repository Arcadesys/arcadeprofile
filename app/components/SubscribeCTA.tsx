'use client';

import { useId, useState } from 'react';
import { type Audience, type Magnet, type Source } from '@/lib/subscribe-types';

type Variant = 'default' | 'compact';

interface SubscribeCTAProps {
  variant?: Variant;
  eyebrow?: string;
  heading?: string;
  blurb?: string;
  buttonLabel?: string;
  source?: Source;
  magnet?: Magnet;
}

const SHARE_URL = 'https://thearcades.me';
const SHARE_TEXT = 'Serialized fiction by email — every installment as it lands. Subscribe to Free Play Publishing:';

const SUCCESS_COPY = '✓ You’re in. First installment is on its way.';

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; hint: string }> = [
  { value: 'all', label: 'All', hint: 'fiction & essays' },
  { value: 'fiction', label: 'Fiction', hint: 'serialized stories' },
  { value: 'essays', label: 'Essays', hint: 'on writing, tools, oddities' },
];

export default function SubscribeCTA({
  variant = 'default',
  eyebrow = 'Fiction by email',
  heading = 'Read it as it arrives',
  blurb = 'Fiction Mon/Wed/Fri, essays Tue/Thu — each one lands in your inbox the moment it publishes.',
  buttonLabel = 'Start reading',
  source,
  magnet,
}: SubscribeCTAProps) {
  const inputId = useId();
  const groupId = useId();
  const [email, setEmail] = useState('');
  const [audiences, setAudiences] = useState<Set<Audience>>(() => new Set(['all']));
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [magnetFiles, setMagnetFiles] = useState<Array<{ url: string; filename: string; label: string }>>([]);
  const [partialFailures, setPartialFailures] = useState<Audience[]>([]);

  function toggleAudience(audience: Audience) {
    setAudiences((prev) => {
      const next = new Set(prev);
      if (next.has(audience)) {
        next.delete(audience);
        return next;
      }
      // "All" is the union of Fiction and Essays — checking it clears the
      // others, and checking either of the others clears "All".
      if (audience === 'all') {
        next.clear();
        next.add('all');
      } else {
        next.delete('all');
        next.add(audience);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (audiences.size === 0) {
      setErrorMsg('Pick at least one list.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          audiences: Array.from(audiences),
          ...(source ? { source } : {}),
          ...(magnet ? { magnet } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      if (Array.isArray(data.magnet?.files)) {
        setMagnetFiles(data.magnet.files);
      }
      const requested = Array.from(audiences);
      const subscribed: Audience[] = Array.isArray(data.subscribed) ? data.subscribed : requested;
      setPartialFailures(requested.filter((a) => !subscribed.includes(a)));
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  async function handleShare() {
    const shareData = { title: 'Free Play Publishing', text: SHARE_TEXT, url: SHARE_URL };
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
  const margin = isCompact ? '0' : '3rem 0 0';

  return (
    <aside style={{ margin }}>
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
            {SUCCESS_COPY}
          </p>
          {partialFailures.length > 0 && (
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--fg-muted)',
              margin: '0 0 0.75rem',
              lineHeight: 1.55,
            }}>
              Heads-up: we couldn&apos;t add you to{' '}
              <strong style={{ color: 'var(--fg)' }}>
                {partialFailures.map((a) => a[0].toUpperCase() + a.slice(1)).join(' + ')}
              </strong>{' '}
              just now. Try again in a minute, or reply to any email and I&apos;ll fix it by hand.
            </p>
          )}
          {magnetFiles.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.85rem',
              }}
            >
              {magnetFiles.map((file) => (
                <a
                  key={file.url}
                  href={file.url}
                  download={file.filename}
                  style={{
                    padding: '0.55rem 1rem',
                    background: 'var(--neon-pink)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  {file.label === 'EPUB' ? '📖' : '📄'} Download {file.label}
                </a>
              ))}
            </div>
          )}
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
            {shareState === 'copied' ? '✓ Link copied' : 'Share Free Play Publishing'}
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <fieldset
              aria-labelledby={`${groupId}-legend`}
              style={{ border: 'none', padding: 0, margin: '0 0 0.25rem' }}
            >
              <legend
                id={`${groupId}-legend`}
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  margin: '0 0 0.45rem',
                  padding: 0,
                }}
              >
                What do you want?
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.55rem',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={audiences.has(opt.value)}
                      onChange={() => toggleAudience(opt.value)}
                      disabled={status === 'loading'}
                      style={{ accentColor: 'var(--neon-pink)' }}
                    />
                    <span>
                      <span style={{ fontWeight: 600 }}>{opt.label}</span>{' '}
                      <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
                        ({opt.hint})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                  background: 'var(--btn-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--fg)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="buy-button"
                disabled={status === 'loading' || audiences.size === 0}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: status === 'loading' ? 'wait' : audiences.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: audiences.size === 0 ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {status === 'loading' ? 'Subscribing…' : buttonLabel}
              </button>
            </div>
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
