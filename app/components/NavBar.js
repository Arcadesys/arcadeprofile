// File: app/components/NavBar.js

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';
import { mainMenuLinks } from '../../components/menu';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const linkIsActive = (link) => {
    if (link.prefixMatch) {
      return pathname === link.href || pathname.startsWith(`${link.href}/`);
    }
    return pathname === link.href;
  };

  return (
    <nav className={styles.navbar}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <Image src="/the-arcades-logo.svg" alt="The Arcades" width={180} height={36} priority />
      </Link>

      <button
        type="button"
        className={styles.hamburger}
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-controls="site-menu"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <span aria-hidden="true">{isOpen ? '×' : '☰'}</span>
      </button>

      {/* Navigation menu */}
      <div id="site-menu" className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <ul>
          {mainMenuLinks.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classNames(link.isPrimary && styles.primaryLink, linkIsActive(link) && styles.active)}
                  aria-current={linkIsActive(link) ? 'page' : undefined}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className={classNames(link.isPrimary && styles.primaryLink, linkIsActive(link) && styles.active)}
                  aria-current={linkIsActive(link) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

    </nav>
  );
}
