'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LEGACY_READING_PROGRESS_STORAGE_KEY,
  migrateLegacyReadingProgress,
  parseReadingContinuity,
  READING_CONTINUITY_STORAGE_KEY,
  type ReadingContinuityRecord,
} from '@/lib/reading-continuity';

function readStoredProgress(): ReadingContinuityRecord | null {
  try {
    const current = parseReadingContinuity(window.localStorage.getItem(READING_CONTINUITY_STORAGE_KEY));
    if (current) return current;
    const legacy = migrateLegacyReadingProgress(window.localStorage.getItem(LEGACY_READING_PROGRESS_STORAGE_KEY));
    if (legacy) {
      window.localStorage.setItem(READING_CONTINUITY_STORAGE_KEY, JSON.stringify(legacy));
      window.localStorage.removeItem(LEGACY_READING_PROGRESS_STORAGE_KEY);
    }
    return legacy;
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
  const [progress, setProgress] = useState<ReadingContinuityRecord | null>(null);

  useEffect(() => {
    setProgress(readStoredProgress());
  }, []);

  if (!progress) return null;

  const dismiss = () => {
    try { window.localStorage.removeItem(READING_CONTINUITY_STORAGE_KEY); } catch { /* storage is optional */ }
    setProgress(null);
  };

  return (
    <section style={{ margin: '0 0 2rem' }}>
      <Link
        href={progress.canonicalPath}
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
          {progress.collection ? `${progress.collection.title}: ` : ''}{progress.title}
        </span>
        <span style={{ marginLeft: '0.5rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
          {progress.collection ? `Part ${progress.collection.position} / ${progress.collection.total}` : 'Open piece'}
        </span>
      </Link>
      <button type="button" onClick={dismiss} style={{ marginTop: '0.5rem' }}>Dismiss</button>
    </section>
  );
}
