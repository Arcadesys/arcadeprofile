'use client';

import { useEffect, useState, useCallback } from 'react';

type SocialPostStatus = 'scheduled' | 'posted' | 'cancelled' | 'failed';

interface SocialHistoryEntry {
  id: string;
  slug: string | null;
  platform: string;
  variant: string;
  text: string;
  linkUrl?: string;
  status: SocialPostStatus;
  scheduledAt?: string;
  postedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  failureReason?: string;
  postUri?: string;
  postUrl?: string;
}

const STATUS_COLORS: Record<SocialPostStatus, string> = {
  scheduled: '#ff3cac',
  posted: '#4ade80',
  cancelled: '#888',
  failed: '#ef4444',
};

const STATUS_LABELS: Record<SocialPostStatus, string> = {
  scheduled: 'Scheduled',
  posted: 'Posted',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export default function SocialPage() {
  const [history, setHistory] = useState<SocialHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SocialPostStatus>('all');
  const [posting, setPosting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Compose form state
  const [composeText, setComposeText] = useState('');
  const [composeLinkUrl, setComposeLinkUrl] = useState('');
  const [composeScheduledAt, setComposeScheduledAt] = useState('');
  const [composeVariant, setComposeVariant] = useState<'short' | 'long' | 'custom'>('custom');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/social/history');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setError('Failed to load social history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handlePost = async () => {
    if (!composeText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        text: composeText.trim(),
        platform: 'bluesky',
        variant: composeVariant,
      };
      if (composeLinkUrl.trim()) body.linkUrl = composeLinkUrl.trim();
      if (composeScheduledAt) body.scheduledAt = new Date(composeScheduledAt).toISOString();

      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Post failed');
      } else {
        setComposeText('');
        setComposeLinkUrl('');
        setComposeScheduledAt('');
        fetchHistory();
      }
    } catch {
      setError('Network error');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/social/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchHistory();
    } catch {
      setError('Failed to cancel');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/social/process', { method: 'POST' });
      const data = await res.json();
      if (data.processed > 0) fetchHistory();
    } catch {
      setError('Failed to process scheduled posts');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = filter === 'all' ? history : history.filter(e => e.status === filter);

  const charCount = new TextEncoder().encode(composeText).length;
  const isOverLimit = charCount > 300;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--fg)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Social Posts
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Post to Bluesky — schedule or send immediately
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href="/admin/schedule"
            style={{
              color: 'var(--fg-muted)', fontSize: '0.85rem', textDecoration: 'none',
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
            }}
          >
            Blog Schedule
          </a>
          <button
            onClick={handleProcess}
            disabled={processing}
            style={{
              background: 'var(--surface-hover)', color: 'var(--fg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer',
              opacity: processing ? 0.5 : 1,
            }}
          >
            {processing ? 'Processing...' : 'Process Queue'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
          color: '#ef4444', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* Compose */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '1.25rem', marginBottom: '2rem',
      }}>
        <h2 style={{ color: 'var(--fg)', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
          New Post
        </h2>
        <textarea
          value={composeText}
          onChange={e => setComposeText(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          style={{
            width: '100%', background: 'var(--surface-hover)', color: 'var(--fg)',
            border: `1px solid ${isOverLimit ? '#ef4444' : 'var(--border)'}`,
            borderRadius: 8, padding: '0.75rem', fontSize: '0.9rem',
            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 4, marginBottom: '0.75rem',
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: isOverLimit ? '#ef4444' : 'var(--fg-muted)',
          }}>
            {charCount}/300 characters
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['short', 'long', 'custom'] as const).map(v => (
              <button
                key={v}
                onClick={() => setComposeVariant(v)}
                style={{
                  background: composeVariant === v ? 'var(--accent)' : 'transparent',
                  color: composeVariant === v ? '#000' : 'var(--fg-muted)',
                  border: `1px solid ${composeVariant === v ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <input
          type="url"
          value={composeLinkUrl}
          onChange={e => setComposeLinkUrl(e.target.value)}
          placeholder="Link URL (optional)"
          style={{
            width: '100%', background: 'var(--surface-hover)', color: 'var(--fg)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem',
            fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Schedule:</label>
            <input
              type="datetime-local"
              value={composeScheduledAt}
              onChange={e => setComposeScheduledAt(e.target.value)}
              style={{
                background: 'var(--surface-hover)', color: 'var(--fg)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '4px 8px', fontSize: '0.85rem',
              }}
            />
            {composeScheduledAt && (
              <button
                onClick={() => setComposeScheduledAt('')}
                style={{
                  background: 'transparent', color: 'var(--fg-muted)', border: 'none',
                  cursor: 'pointer', fontSize: '0.8rem',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={handlePost}
            disabled={posting || !composeText.trim() || isOverLimit}
            style={{
              background: composeScheduledAt ? '#ff3cac' : 'var(--accent)',
              color: '#000', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', opacity: (posting || !composeText.trim() || isOverLimit) ? 0.5 : 1,
            }}
          >
            {posting ? 'Sending...' : composeScheduledAt ? 'Schedule' : 'Post to Bluesky'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all', 'scheduled', 'posted', 'failed', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--surface-hover)' : 'transparent',
              color: f === 'all' ? 'var(--fg)' : STATUS_COLORS[f as SocialPostStatus] || 'var(--fg)',
              border: `1px solid ${filter === f ? 'var(--border)' : 'transparent'}`,
              borderRadius: 6, padding: '4px 12px', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {f === 'all' ? `All (${history.length})` : `${STATUS_LABELS[f as SocialPostStatus]} (${history.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {/* History list */}
      {loading ? (
        <div style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '3rem' }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '3rem' }}>
          {history.length === 0 ? 'No social posts yet.' : 'No posts match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(entry => (
            <div
              key={entry.id}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: STATUS_COLORS[entry.status],
                    }} />
                    <span style={{ color: STATUS_COLORS[entry.status], fontSize: '0.8rem', fontWeight: 600 }}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span style={{ color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                      {entry.platform}
                    </span>
                    {entry.variant !== 'custom' && (
                      <span style={{
                        color: 'var(--fg-muted)', fontSize: '0.7rem',
                        background: 'var(--surface-hover)', borderRadius: 4, padding: '1px 6px',
                      }}>
                        {entry.variant}
                      </span>
                    )}
                    {entry.slug && (
                      <span style={{
                        color: 'var(--accent)', fontSize: '0.7rem',
                        background: 'var(--surface-hover)', borderRadius: 4, padding: '1px 6px',
                      }}>
                        {entry.slug}
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: 'var(--fg)', fontSize: '0.9rem', margin: 0,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {entry.text}
                  </p>
                  {entry.linkUrl && (
                    <p style={{ color: 'var(--fg-muted)', fontSize: '0.75rem', margin: '4px 0 0 0' }}>
                      Link: {entry.linkUrl}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {entry.scheduledAt && (
                      <span style={{ color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                        Scheduled: {new Date(entry.scheduledAt).toLocaleString()}
                      </span>
                    )}
                    {entry.postedAt && (
                      <span style={{ color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                        Posted: {new Date(entry.postedAt).toLocaleString()}
                      </span>
                    )}
                    {entry.cancelledAt && (
                      <span style={{ color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                        Cancelled: {new Date(entry.cancelledAt).toLocaleString()}
                      </span>
                    )}
                    {entry.failureReason && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                        Error: {entry.failureReason}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {entry.postUrl && (
                    <a
                      href={entry.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--accent)', fontSize: '0.8rem', textDecoration: 'none',
                        border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
                      }}
                    >
                      View
                    </a>
                  )}
                  {entry.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancel(entry.id)}
                      style={{
                        background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
