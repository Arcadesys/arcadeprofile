'use client';

import { useDocumentInfo } from '@payloadcms/ui';
import { useEffect, useState } from 'react';

import type { ShareUrlReason, ShareUrlResponse } from '@/lib/post-share-url-types';

type State =
  | { kind: 'unsaved' }
  | { kind: 'loading' }
  | { kind: 'ready'; url: string; absoluteUrl: string }
  | { kind: 'empty'; reason: ShareUrlReason }
  | { kind: 'error' };

const REASON_COPY: Record<ShareUrlReason, string> = {
  draft: 'Share URL appears after publishing.',
  'no-group': 'Post has no group — no share URL.',
  'no-slug': 'Post has no slug — no share URL.',
  'not-found': 'Could not locate this post in its group.',
};

export default function PostShareLinkField() {
  const { id } = useDocumentInfo();
  const [state, setState] = useState<State>(() => (id ? { kind: 'loading' } : { kind: 'unsaved' }));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) {
      setState({ kind: 'unsaved' });
      return;
    }
    setState({ kind: 'loading' });
    const ac = new AbortController();
    fetch(`/api/posts/${id}/share-url`, { signal: ac.signal, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: ShareUrlResponse) => {
        if (data.url && data.absoluteUrl) {
          setState({ kind: 'ready', url: data.url, absoluteUrl: data.absoluteUrl });
        } else {
          setState({ kind: 'empty', reason: data.reason ?? 'not-found' });
        }
      })
      .catch((err) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setState({ kind: 'error' });
      });
    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    if (state.kind !== 'ready') return;
    try {
      await navigator.clipboard.writeText(state.absoluteUrl);
      setCopied(true);
    } catch {
      // clipboard blocked — silently ignore
    }
  }

  return (
    <div style={containerStyle}>
      <p style={labelStyle}>Share URL</p>
      {state.kind === 'unsaved' && (
        <p style={mutedStyle}>Save the post to generate a share URL.</p>
      )}
      {state.kind === 'loading' && <p style={mutedStyle}>Loading…</p>}
      {state.kind === 'empty' && <p style={mutedStyle}>{REASON_COPY[state.reason]}</p>}
      {state.kind === 'error' && <p style={mutedStyle}>Could not load share URL.</p>}
      {state.kind === 'ready' && (
        <>
          <div style={urlBoxStyle}>{state.url}</div>
          <div style={actionsStyle}>
            <button type="button" onClick={handleCopy} style={buttonStyle}>
              Copy link
            </button>
            <a
              href={state.absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              View live ↗
            </a>
          </div>
          <span role="status" aria-live="polite" style={statusStyle}>
            {copied ? '✓ Copied' : ''}
          </span>
        </>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  margin: '0 0 0.4rem',
  color: 'var(--theme-elevation-500, #888)',
  fontWeight: 600,
};

const mutedStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--theme-elevation-500, #888)',
  margin: 0,
  fontStyle: 'italic',
};

const urlBoxStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
  fontSize: '0.8rem',
  padding: '0.4rem 0.55rem',
  border: '1px solid var(--theme-elevation-150, #ddd)',
  borderRadius: '4px',
  background: 'var(--theme-elevation-50, #f7f7f7)',
  color: 'var(--theme-text, inherit)',
  marginBottom: '0.5rem',
  wordBreak: 'break-all',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

const buttonStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.3rem 0.6rem',
  border: '1px solid var(--theme-elevation-200, #ccc)',
  borderRadius: '3px',
  background: 'var(--theme-elevation-50, #f7f7f7)',
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
};

const linkStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--theme-success-500, #2a8)',
  textDecoration: 'none',
};

const statusStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--theme-success-500, #2a8)',
  marginTop: '0.35rem',
  minHeight: '1em',
};
