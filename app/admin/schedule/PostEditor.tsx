'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Frontmatter {
  title: string;
  date: string;
  excerpt: string;
  order: number | null;
  newsletterHeading: string | null;
  newsletterDescription: string | null;
}

interface PostData {
  slug: string;
  group: string | null;
  frontmatter: Frontmatter;
  body: string;
}

interface PostEditorProps {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PostEditor({ slug, onClose, onSaved }: PostEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostData | null>(null);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    title: '', date: '', excerpt: '', order: null,
    newsletterHeading: null, newsletterDescription: null,
  });
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) {
        setError(`Failed to load post (${res.status})`);
        setLoading(false);
        return;
      }
      const data: PostData = await res.json();
      setPost(data);
      setFrontmatter(data.frontmatter);
      setBody(data.body);
      setDirty(false);
    } catch {
      setError('Failed to load post (network error)');
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const updateFm = (patch: Partial<Frontmatter>) => {
    setFrontmatter(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const updateBody = (value: string) => {
    setBody(value);
    setDirty(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter, body }),
      });
      if (!res.ok) {
        setError('Failed to save');
        setSaving(false);
        return;
      }
      setDirty(false);
      setSaving(false);
      onSaved();
    } catch {
      setError('Failed to save (network error)');
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return;
    onClose();
  };

  // Keyboard: Cmd+S to save, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        save();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  });

  const inputStyle = {
    fontSize: '0.85rem',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--fg)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600 as const,
    color: 'var(--fg-muted)',
    marginBottom: '0.25rem',
    display: 'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '55vw',
          minWidth: 420,
          maxWidth: 760,
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          zIndex: 1000,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              Edit Post
            </h2>
            {post?.group && (
              <span style={{
                fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                background: 'var(--surface-hover)', color: 'var(--fg-muted)',
                border: '1px solid var(--border)',
              }}>
                {post.group}
              </span>
            )}
            {dirty && (
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 }}>
                Unsaved changes
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving && <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Saving...</span>}
            {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
            <button
              onClick={save}
              disabled={!dirty || saving}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: dirty ? 'var(--accent)' : 'var(--surface)',
                color: dirty ? '#fff' : 'var(--fg-muted)',
                cursor: dirty ? 'pointer' : 'default',
                fontSize: '0.8rem',
                fontWeight: 600,
                opacity: dirty ? 1 : 0.5,
              }}
            >
              Save
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
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
        ) : error && !post ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '1rem', color: 'var(--fg-muted)' }}>
            <p style={{ color: 'var(--fg)' }}>{error}</p>
            <button
              onClick={fetchPost}
              style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
            {/* Title */}
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={frontmatter.title}
                onChange={e => updateFm({ title: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Date + Order row */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={frontmatter.date}
                  onChange={e => updateFm({ date: e.target.value })}
                  style={inputStyle}
                />
              </div>
              {post?.group && (
                <div style={{ width: 100 }}>
                  <label style={labelStyle}>Order</label>
                  <input
                    type="number"
                    value={frontmatter.order ?? ''}
                    onChange={e => updateFm({ order: e.target.value ? parseInt(e.target.value, 10) : null })}
                    style={inputStyle}
                    placeholder="#"
                  />
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <label style={labelStyle}>Excerpt</label>
              <textarea
                value={frontmatter.excerpt}
                onChange={e => updateFm({ excerpt: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            {/* Advanced fields (collapsible) */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--fg-muted)', fontSize: '0.75rem', padding: 0,
                  textDecoration: 'underline', textUnderlineOffset: '2px',
                }}
              >
                {showAdvanced ? 'Hide' : 'Show'} newsletter fields
              </button>
              {showAdvanced && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Newsletter Heading</label>
                    <input
                      type="text"
                      value={frontmatter.newsletterHeading || ''}
                      onChange={e => updateFm({ newsletterHeading: e.target.value || null })}
                      style={inputStyle}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Newsletter Description</label>
                    <textarea
                      value={frontmatter.newsletterDescription || ''}
                      onChange={e => updateFm({ newsletterDescription: e.target.value || null })}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* MDX Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 200 }}>
              <label style={labelStyle}>Content (MDX)</label>
              <textarea
                value={body}
                onChange={e => updateBody(e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  resize: 'none',
                  fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  tabSize: 2,
                }}
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
