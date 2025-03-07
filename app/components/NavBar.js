// File: app/components/NavBar.js

'use client'; // This ensures the component is rendered as a client component

import { useState } from 'react';
import styles from './NavBar.module.css';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={styles.navbar}>
      {/* Hamburger icon */}
      <div className={styles.hamburger} onClick={toggleMenu}>
        ☰
      </div>

      {/* Slide-out menu drawer */}
      <div className={`${styles.menu} ${isOpen ? styles.open : ''}`}>
        <ul className="button-grid">
          <li><a className="text-link" href="/" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Home</a></li>
          <li><a className="text-link" href="/books" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Books</a></li>
          <li><a className="text-link" href="/resume/TuckerAustenScrumMaster.pdf" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Resume</a></li>
          <li><a className="text-link" href="https://www.linkedin.com/in/austen-tucker-0968a914/" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>LinkedIn</a></li>
          <li><a className="text-link" href="/did" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Why the Arcades?</a></li>
          <li><a className="text-link" href="/projects" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Projects</a></li>
          <li><a className="text-link" href="/contact" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Contact</a></li>
          <li><a className="text-link" href="https://toonpunk.thearcades.me" target="_blank" rel="noopener noreferrer" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Toonpunk Zine</a></li>
          <li><a className="text-link" href="https://github.com/Arcadesys" onMouseEnter={(e) => e.target.classList.add('gaysparkles')} onMouseLeave={(e) => e.target.classList.remove('gaysparkles')}>Github</a></li>
        </ul>
      </div>
    </nav>
  );
}
