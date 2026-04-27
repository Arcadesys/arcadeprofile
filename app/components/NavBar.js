// File: app/components/NavBar.js

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';
import { mainMenuLinks, projectCategoryLinks } from '../../components/menu';

const RESOURCE_LABELS = {
  post: 'Posts',
  preview: 'Sample',
  buy: 'Buy',
  youtube: 'Video',
  audio: 'Audio',
  experiment: 'Experiment',
  repo: 'Repo',
  download: 'Download',
  other: 'Link',
};

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function getResourceBadges(project) {
  const kinds = new Set((project.resources || []).map(resource => resource.kind));
  if (project.relatedPostSlugs?.length) {
    kinds.add('post');
  }
  return Array.from(kinds)
    .map(kind => RESOURCE_LABELS[kind])
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * @param {{ projects?: import('@/lib/payload').ProjectHub[] }} props
 */
export default function NavBar({ projects = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const navRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
    setProjectsOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!projectsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setProjectsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProjectsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [projectsOpen]);

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
    <nav className={styles.navbar} ref={navRef}>
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
            <li key={link.href} className={link.panel ? styles.panelItem : ''}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classNames(link.isPrimary && styles.primaryLink, linkIsActive(link) && styles.active)}
                  aria-current={linkIsActive(link) ? 'page' : undefined}
                  onClick={() => setProjectsOpen(false)}
                >
                  {link.label}
                </a>
              ) : link.panel === 'projects' ? (
                <>
                  <button
                    type="button"
                    className={classNames(styles.menuButton, linkIsActive(link) && styles.active)}
                    aria-expanded={projectsOpen}
                    aria-controls="projects-menu-panel"
                    onClick={() => setProjectsOpen(open => !open)}
                  >
                    {link.label}
                    <span aria-hidden="true" className={styles.chevron}>
                      ▾
                    </span>
                  </button>
                  <div
                    id="projects-menu-panel"
                    className={classNames(styles.projectsPanel, projectsOpen && styles.projectsPanelOpen)}
                  >
                    <div className={styles.panelHeader}>
                      <Link href="/projects" onClick={() => setProjectsOpen(false)}>
                        All Projects
                      </Link>
                      <span>Featured work, products, media, and experiments.</span>
                    </div>

                    <div className={styles.categoryLinks} aria-label="Project categories">
                      {projectCategoryLinks.map(category => (
                        <Link
                          key={category.href}
                          href={category.href}
                          onClick={() => setProjectsOpen(false)}
                        >
                          {category.label}
                        </Link>
                      ))}
                    </div>

                    <div className={styles.featuredProjects}>
                      {projects.length > 0 ? (
                        projects.map(project => (
                          <Link
                            key={project.slug}
                            href={`/projects/${project.slug}`}
                            className={styles.featuredProject}
                            onClick={() => setProjectsOpen(false)}
                          >
                            <span className={styles.featuredProjectTitle}>{project.title}</span>
                            {project.description && (
                              <span className={styles.featuredProjectDescription}>
                                {project.description}
                              </span>
                            )}
                            <span className={styles.resourceBadges}>
                              {getResourceBadges(project).map(label => (
                                <span key={label}>{label}</span>
                              ))}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <Link
                          href="/projects"
                          className={styles.featuredProject}
                          onClick={() => setProjectsOpen(false)}
                        >
                          <span className={styles.featuredProjectTitle}>Browse Projects</span>
                          <span className={styles.featuredProjectDescription}>
                            Tools, fiction, experiments, and media live here.
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  href={link.href}
                  className={classNames(link.isPrimary && styles.primaryLink, linkIsActive(link) && styles.active)}
                  aria-current={linkIsActive(link) ? 'page' : undefined}
                  onClick={() => setProjectsOpen(false)}
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
