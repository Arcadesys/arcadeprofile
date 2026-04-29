'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainMenuLinks } from '@/components/menu';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.75rem 1.5rem',
        background: 'rgba(10, 5, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--neon-pink)',
          textDecoration: 'none',
          marginRight: '1.5rem',
          whiteSpace: 'nowrap',
        }}
      >
        The Arcades
      </Link>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {mainMenuLinks.map(link => {
          const isActive = link.prefixMatch
            ? pathname.startsWith(link.href)
            : pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                textDecoration: 'none',
                color: isActive ? 'var(--neon-pink)' : 'var(--fg-muted)',
                background: isActive ? 'rgba(255, 60, 172, 0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--neon-pink)' : 'transparent'}`,
                transition: 'color 0.15s, background 0.15s, border-color 0.15s',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
