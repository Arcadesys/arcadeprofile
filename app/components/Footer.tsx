import Link from 'next/link';
import FooterSubscribe from './FooterSubscribe';
import {
  BUILDER_SITE_NAV_ITEM,
  ORIENTATION_NAV_ITEMS,
  PORTFOLIO_NAV_ITEM,
  TOYS_NAV_ITEM,
  type NavItem,
} from '@/lib/nav-items';
import { SITE_NAME } from '@/lib/site-brand';

import styles from './Footer.module.css';

// Destinations the rail does not carry. Labels come from nav-items so they cannot drift from the rest of the site.
// Builder work (case studies, demos, résumé) is one door away on work.thearcades.me.
const MORE_ITEMS: readonly NavItem[] = [PORTFOLIO_NAV_ITEM, TOYS_NAV_ITEM, BUILDER_SITE_NAV_ITEM];

const isExternal = (href: string) => /^https?:\/\//.test(href);

function FooterLink({ item }: { item: NavItem }) {
  return (
    <li>
      <Link href={item.href}>
        {item.label}
        {isExternal(item.href) ? <span aria-hidden="true"> ↗</span> : null}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <FooterSubscribe />

        <nav aria-label="Footer" className={styles.nav}>
          <ul className={`${styles.list} ${styles.primary}`}>
            {ORIENTATION_NAV_ITEMS.map((item) => <FooterLink key={item.id} item={item} />)}
          </ul>
          <ul className={`${styles.list} ${styles.more}`}>
            {MORE_ITEMS.map((item) => <FooterLink key={item.id} item={item} />)}
            <li><a href="https://freeplaypublishing.com" target="_blank" rel="noreferrer">Free Play Publishing <span aria-hidden="true">↗</span></a></li>
            <li><a href="/feed.xml">RSS</a></li>
          </ul>
        </nav>

        <p className={styles.copy}>© {new Date().getFullYear()} Austen Tucker · {SITE_NAME}</p>
      </div>
    </footer>
  );
}
