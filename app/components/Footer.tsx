import Link from 'next/link';
import FooterSubscribe from './FooterSubscribe';

export default function Footer() {
  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 1,
        marginTop: 'clamp(3rem, 8vw, 6rem)',
        padding: 'clamp(2rem, 5vw, 3rem) 1rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-deep)',
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
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Link href="/bio" style={{ color: 'var(--fg-muted)' }}>Bio</Link>
          <Link href="/projects" style={{ color: 'var(--fg-muted)' }}>Projects</Link>
          <Link href="/portfolio" style={{ color: 'var(--fg-muted)' }}>Portfolio</Link>
          <Link href="/toys" style={{ color: 'var(--fg-muted)' }}>Toys</Link>
          <Link href="/latest" style={{ color: 'var(--fg-muted)' }}>Latest</Link>
          <Link href="/subscribe" style={{ color: 'var(--fg-muted)' }}>Subscribe</Link>
          <a href="/feed.xml" style={{ color: 'var(--fg-muted)' }}>RSS</a>
        </nav>

        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          © {new Date().getFullYear()} Austen Tucker · Free Play Publishing
        </p>
      </div>
    </footer>
  );
}
