import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import SubscriptionForm from '@/app/components/SubscriptionForm';

export const metadata: Metadata = {
  title: 'Subscribe',
  description:
    'Serialized fiction and essays by Austen Tucker. Every installment as it lands. All free.',
  alternates: { canonical: '/subscribe' },
  openGraph: {
    type: 'website',
    title: `Subscribe | ${SITE_NAME}`,
    description: 'Serialized fiction and essays by Austen Tucker. Every installment as it lands. All free.',
    url: '/subscribe',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Subscribe | ${SITE_NAME}`,
    description: 'Serialized fiction and essays by Austen Tucker. Every installment as it lands. All free.',
  },
};

export default function SubscribePage() {
  return (
    <main
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 4rem) 1rem clamp(3rem, 8vw, 6rem)',
      }}
    >
      <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', marginBottom: '0.5rem' }}>
        Get the next story in your inbox.
      </h1>
      <p
        style={{
          color: 'var(--fg-muted)',
          marginBottom: '1.5rem',
          fontSize: '1rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          lineHeight: 1.6,
        }}
      >
        Serialized fiction, essays, and build notes by email — sent in the
        order I meant you to read them.
      </p>

      <SubscriptionForm
        source="subscribe-page"
        audiences={['all']}
        updateMode="replace"
        magnet="story"
        showPreferences
        submitLabel="Send me the writing"
      />

      <section
        style={{
          color: 'var(--fg)',
          lineHeight: 1.75,
          fontSize: '1rem',
          marginTop: '3rem',
        }}
      >
        <p style={{ margin: '0 0 1.1rem' }}>
          Here&rsquo;s the deal: I write serialized fiction, essays, and the occasional
          book. Pick the kinds of writing you want, and I&rsquo;ll send updates when there&rsquo;s
          something new to read.
        </p>
        <p style={{ margin: '0 0 1.1rem' }}>
          New writing when it&rsquo;s ready. Free. One-click unsubscribe. Updates might be
          a game, a look behind the scenes of laying out a book, or an essay on why
          everyone should love Markdown. No paywall. No spam. Just the writing, in the
          order I meant for you to read it.
        </p>
        <p style={{ margin: '0 0 1.1rem' }}>
          Subscribe if you want the next piece without having to remember to
          come back and look for it.
        </p>
      </section>
    </main>
  );
}
