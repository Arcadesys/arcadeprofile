'use client';

import { useState } from 'react';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || '').replace(/\/+$/, '');

type Props = {
  cellData?: unknown;
};

export default function PreviewUrlCell({ cellData }: Props) {
  const token = typeof cellData === 'string' ? cellData : '';
  const [copied, setCopied] = useState(false);

  if (!token) return <span style={{ color: 'var(--theme-elevation-400, #999)' }}>—</span>;

  const origin = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${origin}/preview/${token}`;

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={url}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        padding: '0.2rem 0.55rem',
        border: '1px solid var(--theme-elevation-200, #e4e4e7)',
        background: 'var(--theme-elevation-50, #fafafa)',
        borderRadius: 4,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'Copied!' : 'Copy preview'}
    </button>
  );
}
