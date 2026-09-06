import Link from 'next/link';

import type { DiscoveryReadingItem } from '@/lib/reader-discovery';

import styles from './StartReadingShelf.module.css';

export default function StartReadingShelf({
  items,
  heading = 'Start reading',
  compact = false,
  headingId = 'start-reading-heading',
}: {
  items: readonly DiscoveryReadingItem[];
  heading?: string;
  compact?: boolean;
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
          <li key={item.href} className={styles.item}>
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
