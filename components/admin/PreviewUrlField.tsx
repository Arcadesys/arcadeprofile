'use client';

import { useFormFields } from '@payloadcms/ui';
import { useState } from 'react';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || '').replace(/\/+$/, '');

export default function PreviewUrlField() {
  const token = useFormFields(([fields]) => {
    const v = fields?.previewToken?.value;
    return typeof v === 'string' ? v : '';
  });
  const [copied, setCopied] = useState(false);

  const origin = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = token ? `${origin}/preview/${token}` : '';

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard rejected (insecure context, denied perm) — leave UI alone
    }
  }

  return (
    <div
      className="field-type"
      style={{
        marginBottom: '1.25rem',
        padding: '0.85rem 1rem',
        border: '1px solid var(--theme-elevation-150, #e4e4e7)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50, #fafafa)',
      }}
    >
      <label
        className="field-label"
        style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      >
        Preview link
      </label>

      {url ? (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              type="text"
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '0.45rem 0.6rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                border: '1px solid var(--theme-elevation-200, #d4d4d8)',
                borderRadius: 4,
                background: 'var(--theme-input-bg, #fff)',
                color: 'var(--theme-text, #111)',
              }}
            />
            <button
              type="button"
              onClick={copy}
              className="btn btn--style-primary btn--size-small"
              style={{
                whiteSpace: 'nowrap',
                padding: '0 0.9rem',
                fontWeight: 600,
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <p
            className="field-description"
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: '0.75rem',
              color: 'var(--theme-elevation-500, #777)',
              lineHeight: 1.4,
            }}
          >
            Share with privileged readers before publication. Once the post is live, this URL 301-redirects to the canonical post URL — safe to use as a permanent shortlink.
          </p>
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--theme-elevation-500, #777)',
          }}
        >
          A preview link will be generated on first save.
        </p>
      )}
    </div>
  );
}
