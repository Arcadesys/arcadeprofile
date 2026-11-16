'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReaderEventTracker } from '@/lib/reader-analytics';
import type { ReadingContinuityRecord } from '@/lib/reading-continuity';
import { dismissStoredProgress, readStoredProgress } from '@/lib/reading-resume-storage';

import styles from './ContinueReadingBanner.module.css';

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
    try { dismissStoredProgress(window.localStorage); } catch { /* storage is optional */ }
    setProgress(null);
  };

  return (
    <section className={styles.banner} aria-label="Continue reading">
      <Link
        href={progress.canonicalPath}
        className={styles.resume}
        onClick={() => track('resume-click', { canonicalId: pathname, contentType: 'reading-hub', placement: 'resume-banner', destination: progress.canonicalPath })}
      >
        <span className={styles.label}>Continue reading</span>
        <span>
          <span className={styles.title}>{progress.collection ? `${progress.collection.title}: ` : ''}{progress.title}</span>
          <span className={styles.position}>
            {progress.collection ? `Part ${progress.collection.position} / ${progress.collection.total}` : 'Open piece'}
          </span>
        </span>
      </Link>
      <button type="button" className={styles.dismiss} onClick={dismiss}>Dismiss</button>
    </section>
  );
}
