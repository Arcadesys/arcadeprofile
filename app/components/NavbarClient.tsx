'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

import { buildNavigationModel, type NavItem } from '@/lib/nav-items';
import { SITE_NAME, SITE_PLATFORM_NAME } from '@/lib/site-brand';
import ReadingDock from './ReadingDock';

export type { NavItem };

function RailIcon({ href }: { href: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (href) {
    case '/':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><path d="m3.5 10.5 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19.5z" /><path d="M9.25 21v-6.25h5.5V21" /></svg>;
    case '/stories':
    case '/writing':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><path d="M12 6.25C9.5 4.65 6.7 4.4 3.75 5.5v13c3.05-1.15 5.85-.9 8.25.7m0-12.95c2.5-1.6 5.3-1.85 8.25-.75v13c-3.05-1.15-5.85-.9-8.25.7" /><path d="M12 6.25V19.2" /></svg>;
    case '/essays':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><path d="m4 20 3.7-.85L19.5 7.35a2.1 2.1 0 0 0-2.95-2.95L4.75 16.2z" /><path d="m14.9 6.05 3.05 3.05M4 20l.75-3.8 3.05 3.05z" /></svg>;
    case '/projects':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></svg>;
    case '/lab':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><path d="M9 3.5h6M10.25 3.5v6.25L4.8 18.6A1.8 1.8 0 0 0 6.35 21h11.3a1.8 1.8 0 0 0 1.55-2.7l-5.45-8.55V3.5" /><path d="M8.2 16.2h7.6M9.6 13.75h4.8" /></svg>;
    case '/bio':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><circle cx="12" cy="12" r="8.75" /><path d="M12 10.75V16M12 7.6h.01" /></svg>;
    case '/store':
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...common}><path d="M4 9.5h16l-1 10.5H5z" /><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" /></svg>;
    default:
      return null;
  }
}

export default function NavbarClient({ items }: { items: NavItem[] }) {
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
    const isActive = item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.id}
        href={item.href}
        className={[
          isActive ? 'active' : '',
          item.isPrimary ? 'primary' : '',
        ].filter(Boolean).join(' ') || undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <span className="nav-rail-icon"><RailIcon href={item.href} /></span>
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav className={`site-nav${mobileOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">
        <Link href="/" className="nav-logo" aria-label={`${SITE_NAME} — home`}>
          <Image src="/images/moxie/moxie-sleeping.webp" alt="" width={90} height={60} priority />
          <span className="nav-logo-copy"><strong>{SITE_PLATFORM_NAME}</strong><small>{SITE_NAME}</small></span>
        </Link>
        <button className="nav-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="main-nav-links" onClick={() => setMobileOpen((open) => !open)}>
          Menu
        </button>
        <ul id="main-nav-links" role="list">
          {primary.map((item) => <li key={item.id} className={item.href === '/subscribe' ? 'nav-subscribe' : undefined}>{link(item)}</li>)}
        </ul>
      </nav>
      <ReadingDock closeOther={() => setMobileOpen(false)} closeSignal={mobileOpen} />
    </>
  );
}
