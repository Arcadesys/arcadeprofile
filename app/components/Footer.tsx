import Link from 'next/link';
import FooterSubscribe from './FooterSubscribe';
import { SITE_NAME } from '@/lib/site-brand';
import { WORK_RESUME_URL } from '@/lib/work-resume';

export default function Footer() {
  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 1,
        marginTop: 'clamp(3rem, 8vw, 6rem)',
        padding: 'clamp(2rem, 5vw, 3rem) 1rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        <FooterSubscribe />

        <nav
          aria-label="Footer"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem 1.25rem',
            justifyContent: 'center',
            fontSize: '1rem',
              }}
        >
          <Link href="/bio" style={{ color: 'var(--fg-muted)' }}>Bio</Link>
          <a href={WORK_RESUME_URL} style={{ color: 'var(--fg-muted)' }}>Resume</a>
          <Link href="/projects" style={{ color: 'var(--fg-muted)' }}>Projects</Link>
          <Link href="/portfolio" style={{ color: 'var(--fg-muted)' }}>Portfolio</Link>
          <Link href="/lab" style={{ color: 'var(--fg-muted)' }}>Case Studies</Link>
          <Link href="/toys" style={{ color: 'var(--fg-muted)' }}>Toys</Link>
          <Link href="/bookshelf" style={{ color: 'var(--fg-muted)' }}>Bookshelf</Link>
          <Link href="/store" style={{ color: 'var(--fg-muted)' }}>Store</Link>
          <a href="https://freeplaypublishing.com" target="_blank" rel="noreferrer" style={{ color: 'var(--fg-muted)' }}>Books from Free Play Publishing</a>
          <Link href="/latest" style={{ color: 'var(--fg-muted)' }}>Latest</Link>
          <a href="/feed.xml" style={{ color: 'var(--fg-muted)' }}>RSS</a>
        </nav>

        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: '0.9375rem',
            color: 'var(--fg-muted)',
              }}
        >
          © {new Date().getFullYear()} Austen Tucker · {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
