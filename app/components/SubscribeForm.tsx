'use client';

import { useState } from 'react';

const TAG_OPTIONS = [
  { value: 'tech', label: 'Tech & Essays' },
  { value: 'fiction', label: 'Fiction & Stories' },
  { value: 'updates', label: 'Updates' },
] as const;

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [tags, setTags] = useState<string[]>(['tech', 'fiction', 'updates']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tags }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('You\'re subscribed! Check your email for confirmation.');
        setEmail('');
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 0 30px var(--glow-pink)',
        color: 'var(--fg)',
      }}
    >
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--fg)', textAlign: 'left', fontSize: '1.1em', margin: '0 0 0.5rem 0' }}
      >
        Subscribe for updates
      </h3>
      <p
        className="text-sm mb-4"
        style={{ color: 'var(--fg-muted)', margin: '0 0 1rem 0' }}
      >
        Get new posts delivered to your inbox. No spam, unsubscribe anytime.
      </p>

      {status === 'success' ? (
        <p className="text-sm" style={{ color: 'var(--neon-pink)', margin: 0 }}>{message}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap gap-3 mb-3">
            {TAG_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
                style={{ color: 'var(--fg-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={tags.includes(opt.value)}
                  onChange={() => toggleTag(opt.value)}
                  className="rounded"
                  style={{ accentColor: 'var(--neon-pink)' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === 'loading'}
              className="flex-1 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{
                background: 'var(--btn-bg)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading' || tags.length === 0}
              className="button-link whitespace-nowrap disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </form>
      )}

      {status === 'error' && (
        <p className="text-sm mt-2" style={{ color: 'var(--accent)', margin: '0.5rem 0 0 0' }}>{message}</p>
      )}
    </div>
  );
}
