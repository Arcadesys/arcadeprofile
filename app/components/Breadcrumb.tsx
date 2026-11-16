import Link from 'next/link';
import type { BreadcrumbItem } from '@/lib/breadcrumb-trails';
import styles from './Breadcrumb.module.css';

/**
 * The visible trail above a page title. Every level but the last is a link;
 * the last is the current page. Up to 520px wide the CSS shows only the parent
 * ("← Series title"); the full trail stays in the DOM.
 */
export default function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.trail}>
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className={styles.item}>
            {index < lastIndex && item.href ? (
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current} aria-current={index === lastIndex ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
