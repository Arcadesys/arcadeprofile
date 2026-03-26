'use client';

import { useEffect, useState, useCallback } from 'react';

interface SocialPostRecord {
  postedAt: string;
  postUri: string;
  variant: 'short' | 'long';
}

interface MarketingData {
  newsletterBlurb?: string;
  social?: {
    short?: string;
    long?: string;
    bluesky?: SocialPostRecord;
  };
}

interface SocialPanelProps {
  slug: string;
  title: string;
  onClose: () => void;
}

const BLUESKY_CHAR_LIMIT = 300;

function blueskyPostUrl(uri: string): string | null {
  // at://did:plc:xxx/app.bsky.feed.post/yyy -> https://bsky.app/profile/did:plc:xxx/post/yyy
  const match = uri.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return null;
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

export default function SocialPanel({ slug, title, onClose }: SocialPanelProps) {
  const [loading, setLoading] = useState(true);
  const [marketing, setMarketing] = useState<MarketingData | null>(null);
  const [variant, setVariant] = useState<'short' | 'long'>('short');
  const [editText, setEditText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing/${slug}`);
      if (!res.ok) {
        setError(`Failed to load marketing data (${res.status})`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMarketing(data.marketing);
      const m = data.marketing as MarketingData | null;
      if (m?.social) {
        const text = variant === 'short' ? m.social.short : m.social.long;
        setEditText(text || '');
      } else {
        setEditText('');
      }
      setDirty(false);
    } catch {
      setError('Failed to load marketing data');
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchMarketing(); }, [fetchMarketing]);

  // Update edit text when variant changes
  useEffect(() => {
    if (!marketing?.social) return;
    const text = variant === 'short' ? marketing.social.short : marketing.social.long;
    setEditText(text || '');
    setDirty(false);
  }, [variant, marketing]);

  const saveEdit = async () => {
    if (!marketing || saving) return;
    setSaving(true);
    setError(null);
    const updated: MarketingData = {
      ...marketing,
      social: {
        ...marketing.social,
        [variant]: editText,
      },
    };
    try {
      const res = await fetch(`/api/marketing/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketing: updated }),
      });
      if (!res.ok) {
        setError('Failed to save');
        setSaving(false);
        return;
      }
      setMarketing(updated);
      setDirty(false);
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  };

  const postToBluesky = async () => {
    setShowConfirm(false);
    setPosting(true);
    setPostResult(null);
    setError(null);

    // Save any pending edits first
    if (dirty) await saveEdit();

    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, platform: 'bluesky', variant }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPostResult({ success: false, message: data.error || 'Post failed' });
        setPosting(false);
        return;
      }
      setPostResult({ success: true, message: 'Posted to Bluesky!' });
      // Refresh marketing data to get posted status
      await fetchMarketing();
    } catch {
      setPostResult({ success: false, message: 'Network error posting to Bluesky' });
    }
    setPosting(false);
  };

  const hasCopy = marketing?.social && (marketing.social.short || marketing.social.long);
  const currentText = editText;
  const charCount = currentText.length;
  const overLimit = charCount > BLUESKY_CHAR_LIMIT;
  const blueskyRecord = marketing?.social?.bluesky;
  const alreadyPosted = !!blueskyRecord;
  const liveUrl = blueskyRecord ? blueskyPostUrl(blueskyRecord.postUri) : null;

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showConfirm) {
          setShowConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [showConfirm, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '50vw',
        minWidth: 400, maxWidth: 640, background: 'var(--bg)',
        borderLeft: '1px solid var(--border)', zIndex: 1000, overflow: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              Social Posts
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving && <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Saving...</span>}
            {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
            <button
              onClick={onClose}
              style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--fg-muted)' }}>
            Loading...
          </div>
        ) : !hasCopy ? (
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            flex: 1, gap: '0.75rem', color: 'var(--fg-muted)', padding: '2rem',
          }}>
            <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>
              No social copy generated yet for this post.
            </p>
            <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--fg-muted)' }}>
              Generate marketing copy first via the auto-post system.
            </p>
          </div>
        ) : (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>

            {/* Posted status banner */}
            {alreadyPosted && blueskyRecord && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: '#4ade8015', border: '1px solid #4ade8044',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <span style={{ fontSize: '1.1rem' }}>&#x2713;</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4ade80' }}>
                    Posted to Bluesky
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>
                    {new Date(blueskyRecord.postedAt).toLocaleString()} &middot; {blueskyRecord.variant} variant
                  </div>
                </div>
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View post &rarr;
                  </a>
                )}
              </div>
            )}

            {/* Variant selector */}
            <div>
              <label style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block',
              }}>
                Variant
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
                {(['short', 'long'] as const).map(v => {
                  const hasVariant = v === 'short' ? !!marketing?.social?.short : !!marketing?.social?.long;
                  return (
                    <button
                      key={v}
                      onClick={() => setVariant(v)}
                      disabled={!hasVariant}
                      style={{
                        padding: '0.375rem 1rem', borderRadius: 6, border: 'none',
                        background: variant === v ? 'var(--accent)' : 'transparent',
                        color: !hasVariant ? 'var(--border)' : variant === v ? '#fff' : 'var(--fg-muted)',
                        cursor: hasVariant ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable social copy */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Post text
                </label>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: overLimit ? '#ef4444' : charCount > BLUESKY_CHAR_LIMIT * 0.9 ? '#ff8a00' : 'var(--fg-muted)',
                }}>
                  {charCount}/{BLUESKY_CHAR_LIMIT}
                </span>
              </div>
              <textarea
                value={editText}
                onChange={e => { setEditText(e.target.value); setDirty(true); }}
                rows={8}
                style={{
                  fontSize: '0.85rem', padding: '0.75rem', borderRadius: 8,
                  border: overLimit ? '1px solid #ef4444' : '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--fg)', outline: 'none',
                  resize: 'vertical', lineHeight: 1.5, width: '100%', boxSizing: 'border-box',
                }}
              />
              {dirty && (
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{
                    marginTop: '0.5rem', alignSelf: 'flex-end',
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              )}
            </div>

            {/* Mock Bluesky post card preview */}
            <div>
              <label style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block',
              }}>
                Preview
              </label>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '1rem', maxWidth: 480,
              }}>
                {/* Mock Bluesky header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#0085ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    B
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg)' }}>Author</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>@handle.bsky.social</div>
                  </div>
                </div>
                {/* Post text */}
                <div style={{
                  fontSize: '0.85rem', color: 'var(--fg)', lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {currentText || <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>No text</span>}
                </div>
                {/* Mock link card */}
                <div style={{
                  marginTop: '0.75rem', border: '1px solid var(--border)', borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-hover)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>
                      thearcades.me
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Post button */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {alreadyPosted ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: 0 }}>
                  Already posted to Bluesky. Regenerate social copy to post again.
                </p>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={posting || !currentText || overLimit}
                  style={{
                    padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none',
                    background: posting || !currentText || overLimit ? 'var(--surface-hover)' : '#0085ff',
                    color: posting || !currentText || overLimit ? 'var(--fg-muted)' : '#fff',
                    cursor: posting || !currentText || overLimit ? 'default' : 'pointer',
                    fontSize: '0.875rem', fontWeight: 600, width: '100%',
                  }}
                >
                  {posting ? 'Posting...' : 'Post to Bluesky'}
                </button>
              )}
            </div>

            {/* Post result */}
            {postResult && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 8,
                background: postResult.success ? '#4ade8015' : '#ef444415',
                border: `1px solid ${postResult.success ? '#4ade8044' : '#ef444444'}`,
                fontSize: '0.8rem', color: postResult.success ? '#4ade80' : '#ef4444',
                fontWeight: 500,
              }}>
                {postResult.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.5rem 2rem', maxWidth: 480, width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--fg)', margin: '0 0 0.75rem' }}>
              Post to Bluesky?
            </h3>
            <div style={{
              background: 'var(--surface-hover)', borderRadius: 8, padding: '0.75rem',
              marginBottom: '1rem', maxHeight: 200, overflow: 'auto',
            }}>
              <p style={{
                fontSize: '0.85rem', color: 'var(--fg)', margin: 0,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5,
              }}>
                {currentText}
              </p>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
              Platform: <strong>Bluesky</strong> &middot; Variant: <strong>{variant}</strong> &middot; {charCount} chars
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={postToBluesky}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none',
                  background: '#0085ff', color: '#fff', cursor: 'pointer',
                  fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                Post now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
