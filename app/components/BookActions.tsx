import Link from 'next/link';

import type { BookInfo } from '@/data/books';
import styles from './BookActions.module.css';

export default function BookActions({ book, purchaseOnly = false }: { book: BookInfo; purchaseOnly?: boolean }) {
  const actions = purchaseOnly ? book.actions.filter((action) => action.kind === 'purchase') : book.actions;
  if (!actions.length && !book.paperback) return null;
  return (
    <div className={styles.group}>
      <div className={styles.actions}>
        {actions.map((action) => action.external ? (
          <a className={action.kind === 'purchase' ? styles.purchase : styles.secondary} key={action.href} href={action.href} target="_blank" rel="noreferrer">
            {action.label} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <Link className={styles.secondary} key={action.href} href={action.href}>{action.label}</Link>
        ))}
      </div>
      {book.paperback?.status === 'coming-soon' ? (
        <p className={styles.pending}>Paperback coming soon · US ${book.paperback.price}</p>
      ) : null}
    </div>
  );
}
