import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './mff.module.css';

type Side = 'left' | 'right' | 'stack';

export function Callout({
  kicker,
  title,
  hint,
  side,
  link,
  titleId,
  wide,
  children,
}: {
  kicker: string;
  title: string;
  hint: string;
  side: Side;
  link?: { href: string; label: string };
  /**
   * Render the title as a real <h2> with this id rather than a plain span.
   * A whole page section collapsed in here still has to be reachable by
   * heading navigation, which a <span> would silently remove.
   */
  titleId?: string;
  /** Extra breathing room for a section-sized callout. */
  wide?: boolean;
  children: ReactNode;
}) {
  const sideClass =
    side === 'left' ? styles.calloutLeft : side === 'right' ? styles.calloutRight : styles.calloutStack;

  return (
    // The link sits outside <details>: an anchor inside <summary> swallows its
    // own activation, so the reader gets neither navigation nor a toggle.
    <div className={`${styles.callout} ${sideClass}${wide ? ` ${styles.calloutWide}` : ''}`}>
      <details className={styles.calloutBox}>
        <summary className={styles.calloutSummary}>
          <span className={styles.calloutSummaryRow}>
            <span className={styles.kicker}>{kicker}</span>
            <span className={styles.calloutSign} aria-hidden="true" />
          </span>
          {titleId ? (
            <h2 id={titleId} className={styles.calloutTitle}>
              {title}
            </h2>
          ) : (
            <span className={styles.calloutTitle}>{title}</span>
          )}
          <span className={styles.calloutHint}>{hint}</span>
        </summary>
        <div className={styles.calloutBody}>{children}</div>
      </details>
      {link ? (
        <p className={styles.calloutLink}>
          <Link href={link.href}>{link.label} &rarr;</Link>
        </p>
      ) : null}
    </div>
  );
}
