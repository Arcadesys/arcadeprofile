'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildPostUrl } from '@/lib/post-url';
import { READING_PROGRESS_STORAGE_KEY, type ReadingProgress } from './ReadingProgressTracker';

function readStoredProgress(): ReadingProgress | null {
  try {
    const raw = window.localStorage.getItem(READING_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingProgress;
  } catch {
    return null;
  }
}

/**
 * Client-only "pick up where you left off" prompt, sourced from whatever
 * `ReadingProgressTracker` last recorded. Renders nothing until hydrated
 * (SSR-safe, same pattern as PostReactions' clientId) and nothing at all
 * if there's no in-progress series.
 */
export default function ContinueReadingBanner() {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    setProgress(readStoredProgress());
  }, []);

  if (!progress) return null;

  return (
    <section style={{ margin: '0 0 2rem' }}>
      <Link
        href={buildPostUrl(progress.groupSlug, progress.postSlug)}
        style={{
          display: 'block',
          padding: '0.85rem 1.1rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,60,172,0.4)',
          background: 'rgba(255,60,172,0.07)',
          textDecoration: 'none',
          color: 'var(--fg)',
        }}
      >
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--neon-pink)',
          marginBottom: '0.3rem',
        }}>
          Continue reading
        </span>
        <span style={{ fontWeight: 600 }}>
          {progress.groupTitle}: {progress.postTitle}
        </span>
        <span style={{ marginLeft: '0.5rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
          Part {progress.partIndex} / {progress.totalParts}
        </span>
      </Link>
    </section>
  );
}
