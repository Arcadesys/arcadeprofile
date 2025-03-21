// File: app/components/NavBar.js

'use client'; // This ensures the component is rendered as a client component

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle mounting to avoid hydration mismatch
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
    { href: '/', label: 'Home' },
    { href: '/previews', label: 'Books & Previews' },
    { href: 'https://studio.thearcades.me', label: 'Blog', external: true },
  ];

  return (
    <nav className={styles.navbar}>
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
                  className={pathname === link.href ? styles.active : ''}
                  onMouseEnter={(e) => e.target.classList.add('gaysparkles')} 
                  onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}
                >
                  {link.label}
                </a>
              ) : (
                <Link 
                  href={link.href}
                  className={pathname === link.href ? styles.active : ''}
                  onMouseEnter={(e) => e.target.classList.add('gaysparkles')} 
                  onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}
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
