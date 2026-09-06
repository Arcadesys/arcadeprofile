'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReaderEventTracker } from '@/lib/reader-analytics';
import { READING_CONTINUITY_STORAGE_KEY, type ReadingContinuityRecord } from '@/lib/reading-continuity';
import { readStoredProgress } from '@/lib/reading-resume-storage';

/**
 * Client-only "pick up where you left off" prompt, sourced from whatever
 * the reading-continuity tracker last recorded. Renders nothing until hydrated
 * and nothing at all when the saved canonical path is no longer public.
 */
export default function ContinueReadingBanner({ availablePaths = [] }: { availablePaths?: readonly string[] }) {
  const pathname = usePathname();
  const track = useReaderEventTracker();
  const [progress, setProgress] = useState<ReadingContinuityRecord | null>(null);

  useEffect(() => {
    try { setProgress(readStoredProgress(window.localStorage, availablePaths)); } catch { setProgress(null); }
  }, [availablePaths]);

  if (!progress) return null;

  const dismiss = () => {
    try { window.localStorage.removeItem(READING_CONTINUITY_STORAGE_KEY); } catch { /* storage is optional */ }
    setProgress(null);
  };

  return (
    <section style={{ margin: '0 0 2rem' }}>
      <Link
        href={progress.canonicalPath}
        onClick={() => track('resume-click', { canonicalId: pathname, contentType: 'reading-hub', placement: 'resume-banner', destination: progress.canonicalPath })}
        style={{
          display: 'block',
          padding: '0.85rem 1.1rem',
          minHeight: '44px',
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
          fontSize: '0.875rem',
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
      <button type="button" onClick={dismiss} style={{ marginTop: '0.5rem', minHeight: '44px', fontSize: '0.875rem' }}>Dismiss</button>
    </section>
  );
}
