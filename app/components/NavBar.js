// File: app/components/NavBar.js

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';
import CosmosSlider from './CosmosSlider';

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

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  if (!mounted) {
    return null;
  }

  const navLinks = [
    { href: '/',          label: 'Home' },
    { href: '/previews',  label: 'Books' },
    { href: '/stories',   label: 'Stories' },
    { href: '/series',    label: 'Series', prefixMatch: true },
    { href: '/blog',      label: 'Blog' },
    { href: '/portfolio', label: 'Tools' },
    { href: '/about',     label: 'About' },
  ];

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
        <img src="/the-arcades-logo.svg" alt="The Arcades" height={36} />
      </Link>

      {/* Hamburger icon */}
      <div className={styles.hamburger} onClick={toggleMenu}>
        ☰
      </div>

      {/* Navigation menu */}
      <div className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <ul>
          {navLinks.map((link, index) => (
            <li key={index}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkIsActive(link) ? styles.active : ''}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className={linkIsActive(link) ? styles.active : ''}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Cosmos time slider */}
      <CosmosSlider />
    </nav>
  );
}
