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
  children,
}: {
  kicker: string;
  title: string;
  hint: string;
  side: Side;
  link?: { href: string; label: string };
  children: ReactNode;
}) {
  const sideClass =
    side === 'left' ? styles.calloutLeft : side === 'right' ? styles.calloutRight : styles.calloutStack;

  return (
    // The link sits outside <details>: an anchor inside <summary> swallows its
    // own activation, so the reader gets neither navigation nor a toggle.
    <div className={`${styles.callout} ${sideClass}`}>
      <details className={styles.calloutBox}>
        <summary className={styles.calloutSummary}>
          <span className={styles.calloutSummaryRow}>
            <span className={styles.kicker}>{kicker}</span>
            <span className={styles.calloutSign} aria-hidden="true" />
          </span>
          <span className={styles.calloutTitle}>{title}</span>
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
