import Image from 'next/image';
import Link from 'next/link';

import type { DiscoveryReadingItem } from '@/lib/reader-discovery';

import styles from './StartReadingShelf.module.css';

export default function StartReadingShelf({
  items,
  heading = 'Start reading',
  compact = false,
  showCovers = false,
  headingId = 'start-reading-heading',
}: {
  items: readonly DiscoveryReadingItem[];
  heading?: string;
  compact?: boolean;
  /** Enables only verified cover assets; text-first shelves stay unchanged. */
  showCovers?: boolean;
  headingId?: string;
}) {
  return (
    <section className={`${styles.shelf} ${compact ? styles.compact : ''}`} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId}>{heading}</h2>
        <p>Four good places to enter the work.</p>
      </div>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.href} className={`${styles.item} ${showCovers && item.cover ? styles.withCover : ''}`}>
            {showCovers && item.cover ? (
              <Link className={styles.coverLink} href={item.href} aria-label={`Read ${item.title}`}>
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
            <h3><Link href={item.href}>{item.title}</Link></h3>
            {!compact ? <p className={styles.description}>{item.description}</p> : null}
            <p className={styles.meta}>About {item.readingMinutes} min read</p>
            <Link className={styles.read} href={item.href}>Read {item.title} <span aria-hidden="true">→</span></Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
