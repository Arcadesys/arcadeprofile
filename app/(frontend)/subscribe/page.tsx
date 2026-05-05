import type { Metadata } from 'next';
import SubscribeCTA from '@/app/components/SubscribeCTA';

export const metadata: Metadata = {
  title: 'Subscribe — The Arcades',
  description:
    'Early access to books, essays, and serialized fiction from Austen Tucker. Mon/Wed/Fri, straight to your inbox.',
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
      <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', marginBottom: '0.25rem' }}>
        Subscribe
      </h1>
      <p
        style={{
          color: 'var(--fg-muted)',
          marginBottom: '2.5rem',
          fontSize: '1rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}
      >
        Early access to books, essays, and the like.
      </p>

      <section
        style={{
          color: 'var(--fg)',
          lineHeight: 1.75,
          fontSize: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <p style={{ margin: '0 0 1.1rem' }}>
          Here&apos;s the deal: I write serialized fiction, essays, and the occasional
          book. Subscribers get it first &mdash; chapters as they land, drafts before
          they&apos;re polished, and the odd note from the cutting-room floor that never
          makes it to the public site.
        </p>
        <p style={{ margin: '0 0 1.1rem' }}>
          Installments arrive Monday, Wednesday, and Friday. No more, no less. No
          tracking pixels playing dress-up as newsletters. No &ldquo;10 things&rdquo;
          lists. No upsells, no courses, no funnel. Just the writing, in the order I
          meant for you to read it, with a one-click unsubscribe at the bottom of every
          email if it ever stops being your thing.
        </p>
        <p style={{ margin: '0 0 1.1rem' }}>
          When a new book is close, subscribers get the early-access link before
          anyone else &mdash; sometimes weeks before, sometimes only hours, depending
          on how nervous I am. Same goes for longer essays I&apos;d rather not throw at
          the algorithm cold.
        </p>
        <p style={{ margin: '0 0 1.1rem' }}>
          Why ask? Honestly: it makes me feel good to watch the number go up, and to
          know there are people on the other side of the page who care. Writing into
          the void is fine for a while. Writing toward someone is better. If you
          subscribe, you&rsquo;re that someone, and I&rsquo;ll write like it.
        </p>
      </section>

      <SubscribeCTA
        eyebrow="Join the list"
        heading="Get it first"
        blurb="Books, essays, and Mon/Wed/Fri fiction — to your inbox before anywhere else."
        buttonLabel="Subscribe"
      />
    </main>
  );
}
