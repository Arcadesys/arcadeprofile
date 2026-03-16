'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
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

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  if (!mounted) {
    return null;
  }

  const navLinks: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/previews', label: 'Books & Previews' },
    { href: 'https://studio.thearcades.me', label: 'Blog', external: true },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.hamburger} onClick={toggleMenu}>
        ☰
      </div>

      <div className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <ul>
          {navLinks.map((link, index) => (
            <li key={index}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={pathname === link.href ? styles.active : ''}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).classList.add('gaysparkles')}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('gaysparkles')}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className={pathname === link.href ? styles.active : ''}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).classList.add('gaysparkles')}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('gaysparkles')}
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
