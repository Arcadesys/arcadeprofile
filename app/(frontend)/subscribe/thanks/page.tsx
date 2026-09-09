import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thanks for subscribing',
  description: `Your ${SITE_NAME} signup is confirmed.`,
  alternates: { canonical: '/subscribe/thanks' },
  robots: { index: false, follow: true },
};

export default function SubscribeThanksPage() {
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
        You&apos;re on the list.
      </h1>
      <p style={{ maxWidth: '62ch', color: 'var(--fg-muted)', fontSize: '1.125rem', lineHeight: 1.8 }}>
        Thanks for subscribing. Your choices are recorded in ActiveCampaign. You can update them or
        unsubscribe from any email.
      </p>

      <nav aria-label="Next steps" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '2.5rem' }}>
        <Link href="/">Return home</Link>
        <Link href="/this-is-what-i-do-for-fun">Read the collection</Link>
        <Link href="/lab">Visit Case Studies</Link>
      </nav>
    </main>
  );
}
