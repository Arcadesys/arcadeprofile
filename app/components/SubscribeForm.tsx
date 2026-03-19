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
    <div className="border rounded-lg bg-white dark:bg-gray-800 p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Subscribe for updates
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Get new posts delivered to your inbox. No spam, unsubscribe anytime.
      </p>

      {status === 'success' ? (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap gap-3 mb-3">
            {TAG_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tags.includes(opt.value)}
                  onChange={() => toggleTag(opt.value)}
                  className="rounded border-gray-300 dark:border-gray-600"
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
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50"
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
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{message}</p>
      )}
    </div>
  );
}
