import Image from 'next/image';
import Link from 'next/link';

import type { DiscoveryReadingItem } from '@/lib/reader-discovery';

import styles from './StartReadingShelf.module.css';

export default function StartReadingShelf({
  items,
  heading = 'Start reading',
  compact = false,
  showCovers = false,
  columns = 2,
  description = `${items.length} good places to enter the work.`,
  headingId = 'start-reading-heading',
  analyticsPlacement,
}: {
  items: readonly DiscoveryReadingItem[];
  heading?: string;
  compact?: boolean;
  columns?: 2 | 3;
  description?: string;
  /** Enables only verified cover assets; text-first shelves stay unchanged. */
  showCovers?: boolean;
  headingId?: string;
  analyticsPlacement?: 'home_shelf';
}) {
  return (
    <section className={[styles.shelf, compact && styles.compact, columns === 3 && styles.threeColumn].filter(Boolean).join(' ')} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId}>{heading}</h2>
        <p>{description}</p>
      </div>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.href} className={[styles.item, showCovers && item.cover && styles.withCover].filter(Boolean).join(' ')}>
            {showCovers && item.cover ? (
              <Link className={styles.coverLink} href={item.href} aria-label={`Read ${item.title}`} data-analytics-placement={analyticsPlacement}>
                <Image
                  className={styles.cover}
                  src={item.cover.src}
                  alt={item.cover.alt}
                  width={item.cover.width}
                  height={item.cover.height}
                  sizes="(max-width: 680px) calc(100vw - 5.5rem), (max-width: 1100px) 38vw, 390px"
                />
              </Link>
            ) : null}
            <p className={styles.kind}>{item.kind}</p>
            <h3><Link href={item.href} data-analytics-placement={analyticsPlacement}>{item.title}</Link></h3>
            {!compact ? <p className={styles.description}>{item.description}</p> : null}
            <p className={styles.meta}>About {item.readingMinutes} min read</p>
            <Link className={styles.read} href={item.href} data-analytics-placement={analyticsPlacement}>Read {item.title} <span aria-hidden="true">→</span></Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
