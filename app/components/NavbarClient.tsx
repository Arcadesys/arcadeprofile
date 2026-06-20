'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

import type { NavItem } from '@/lib/nav-items';

export type { NavItem };

export default function NavbarClient({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <Link href="/" className="nav-logo" aria-label="Free Play Publishing — home">
        <Image
          src="/free-play-nav.svg"
          alt="Free Play Publishing"
          width={173}
          height={60}
          priority
        />
      </Link>

      <ul role="list">
        {items.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={[
                  isActive ? 'active' : '',
                  item.isPrimary ? 'primary' : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
