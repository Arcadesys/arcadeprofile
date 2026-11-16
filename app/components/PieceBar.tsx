'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  computePieceProgress,
  formatPieceStatus,
  progressPercent,
} from '@/lib/piece-progress';
import styles from './PieceBar.module.css';

export interface PieceBarProps {
  /** Where "back" goes: the series page, or the parent index for a standalone piece. */
  backHref: string;
  /** Label for that destination, e.g. the series title. */
  backLabel: string;
  /** The piece title. */
  title: string;
  /** Part number within a series. Omit for a standalone piece. */
  position?: number;
  /** Number of parts in the series. */
  total?: number;
  /** Estimated reading minutes for the whole piece. */
  readingMinutes?: number;
}

/** Gap kept between the bar and anchor targets, in px. */
const SCROLL_PADDING_GAP = 8;

/**
 * A slim bar that appears once the piece's first h1 has scrolled out of view
 * and stays put: the way back, the title, the position in the series and
 * reading progress.
 *
 * The page must render exactly one `article` around the piece (progress is
 * measured over it; `main` is the fallback) and a visible `h1` inside it.
 * The bar is `position: fixed` and takes no space in the flow.
 */
export default function PieceBar({
  backHref,
  backLabel,
  title,
  position,
  total,
  readingMinutes,
}: PieceBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  // Server render and first client render are identical: hidden, 0%.
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState(0);

  // Visible once the first h1 has scrolled out of view, upwards.
  useEffect(() => {
    const heading =
      document.querySelector('article h1') ??
      document.querySelector('main h1') ??
      document.querySelector('h1');
    if (!heading || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(heading);
    return () => {
      observer.disconnect();
      setVisible(false);
    };
  }, [title]);

  // Reading progress over the article, whole percent only.
  useEffect(() => {
    const article = document.querySelector('article') ?? document.querySelector('main');
    if (!article) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const progress = computePieceProgress({
        articleTop: rect.top + window.scrollY,
        articleHeight: rect.height,
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
      });
      setPercent(progressPercent(progress));
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Images and fonts change the article's height without a scroll event.
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(article);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [title]);

  // While shown, keep anchor jumps and focused elements clear of the bar.
  useEffect(() => {
    const bar = barRef.current;
    if (!visible || !bar) return;

    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;
    const apply = () => {
      const top = Number.parseFloat(window.getComputedStyle(bar).top) || 0;
      root.style.scrollPaddingTop = `${Math.ceil(top + bar.offsetHeight + SCROLL_PADDING_GAP)}px`;
    };
    apply();
    window.addEventListener('resize', apply, { passive: true });

    return () => {
      window.removeEventListener('resize', apply);
      root.style.scrollPaddingTop = previous;
    };
  }, [visible]);

  const status = formatPieceStatus({ position, total, readingMinutes, progress: percent / 100 });

  return (
    <div
      ref={barRef}
      className={styles.bar}
      role="region"
      aria-label="Your place in this piece"
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={visible ? undefined : true}
      inert={!visible}
    >
      <Link className={styles.back} href={backHref}>
        <span aria-hidden="true">←&nbsp;</span>
        <span className={styles.backLabel}>{backLabel}</span>
      </Link>
      <span className={styles.title}>{title}</span>
      {status ? <span className={styles.status}>{status}</span> : null}
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
