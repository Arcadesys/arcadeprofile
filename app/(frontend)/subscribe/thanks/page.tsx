import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thanks for subscribing',
  description: `Confirm your ${SITE_NAME} signup by email. Download La Ligne du Marais in PDF or EPUB.`,
  alternates: { canonical: '/subscribe/thanks' },
  robots: { index: false, follow: true },
};

export default async function SubscribeThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ magnet?: string | string[] }>;
}) {
  const params = await searchParams;
  const hasStoryMagnet = params.magnet === 'story';

  return (
    <main
      style={{
        width: 'min(100% - 2rem, 720px)',
        margin: '0 auto',
        padding: 'clamp(3rem, 8vw, 6rem) 0',
      }}
    >
      <p
        style={{
          margin: '0 0 0.85rem',
          color: 'var(--neon-pink)',
          fontFamily: 'var(--font-mono)',
          fontSize: '1.125rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {SITE_NAME}
      </p>
      <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(2.4rem, 8vw, 4.5rem)', lineHeight: 1 }}>
        Check your inbox.
      </h1>
      <p style={{ maxWidth: '62ch', color: 'var(--fg-muted)', fontSize: '1.125rem', lineHeight: 1.8 }}>
        We sent a confirmation link. Open it to confirm your subscription. You can update your preferences or unsubscribe from any email.
      </p>

      {hasStoryMagnet ? (
        <section
          aria-labelledby="story-downloads"
          style={{
            marginTop: '2.5rem',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            border: '2px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          <h2 id="story-downloads" style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.65rem, 5vw, 2.35rem)' }}>
            Your welcome story
          </h2>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--fg-muted)', fontSize: '1.125rem', lineHeight: 1.7 }}>
            Download <em>La Ligne du Marais</em>, a Paris noir short, in the reading format that works
            best for you.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <a className="button-link" href="/lead-magnets/la-ligne-du-marais.pdf" download="la-ligne-du-marais.pdf">
              Download PDF
            </a>
            <a className="button-link" href="/lead-magnets/la-ligne-du-marais.epub" download="la-ligne-du-marais.epub">
              Download EPUB
            </a>
          </div>
        </section>
      ) : null}

      <nav aria-label="Next steps" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '2.5rem' }}>
        <Link href="/">Return home</Link>
        <Link href="/this-is-what-i-do-for-fun">Read the collection</Link>
        <Link href="/lab">Visit Case Studies</Link>
      </nav>
    </main>
  );
}
