'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isNavItemActive } from '@/lib/nav-active';
import { buildNavigationModel, type NavItem } from '@/lib/nav-items';
import { SITE_NAME } from '@/lib/site-brand';
import type { SearchItem } from '@/lib/search';
import ReadingDock from './ReadingDock';
import SiteSearch from './SiteSearch';

export type { NavItem };

const WORK_SITE_URL = 'https://work.thearcades.me/?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=site_header';

export default function NavbarClient({ items, searchItems, readProjectSlugs = [] }: { items: NavItem[]; searchItems: SearchItem[]; readProjectSlugs?: readonly string[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { primary } = buildNavigationModel(items);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const link = (item: NavItem) => {
    const isActive = isNavItemActive(item.href, pathname, readProjectSlugs);
    return (
      <Link
        href={item.href}
        className={isActive ? 'active' : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setMobileOpen(false)}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <nav className={`site-nav${mobileOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">
      <Link href="/" className="nav-logo" aria-label={`${SITE_NAME} — home`} onClick={() => setMobileOpen(false)}>
        {SITE_NAME}
      </Link>
      <ul id="main-nav-links" role="list">
        {primary.map((item) => <li key={item.id}>{link(item)}</li>)}
        <li>
          <a className="nav-cta" href={WORK_SITE_URL}>
            Work with me <span aria-hidden="true">&nbsp;↗</span>
          </a>
        </li>
      </ul>
      <div className="nav-tools">
        <SiteSearch items={searchItems} onNavigate={() => setMobileOpen(false)} />
        <ReadingDock closeOther={() => setMobileOpen(false)} closeSignal={mobileOpen} />
        <button className="nav-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="main-nav-links" onClick={() => setMobileOpen((open) => !open)}>
          Menu
        </button>
      </div>
    </nav>
  );
}
