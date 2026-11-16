import Link from 'next/link';

import { getHomeFooterNavItems } from '@/lib/home-footer-nav';

import styles from './HomeFooterNav.module.css';

/** Quiet exit routes for the home page, named exactly as the rail names them. */
export default function HomeFooterNav() {
  return (
    <nav className={styles.nav} aria-label="More from The Arcades">
      <ul className={styles.list}>
        {getHomeFooterNavItems().map((item) => (
          <li key={item.id}>
            <Link className={styles.link} href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
