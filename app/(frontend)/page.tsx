import Link from 'next/link';
import SubscribeCTA from '../components/SubscribeCTA';

export default function HomePage() {
  return (
    <main style={{ position: 'relative', zIndex: 1, padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 2rem' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="Austen Tucker illustration"
          style={{ borderRadius: '12px', maxWidth: '100%', width: '320px', height: 'auto' }}
        />
      </div>

      <h1 className="gaysparkles">The Arcades</h1>

      {/* Manifesto */}
      <section style={{ margin: '2rem 0' }}>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          I miss email lists.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          Not newsletters. Not funnels. Not algorithmic confetti.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          I mean the old kind: serialized stories in your inbox, readers replying, people gathering around the same strange little fire.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          So I&rsquo;m bringing that back.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          Subscribe to The Arcades and you&rsquo;ll get fiction every Monday, Wednesday, and Friday, delivered one installment at a time.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          Read like we used to on listservs.<br />
          Read like the Victorians did Dickens.<br />
          Read like the internet can still be a place worth visiting.
        </p>
        <p style={{ lineHeight: 1.75, marginTop: '1rem', color: 'var(--fg-muted)', fontSize: '0.92rem' }}>
          If you enjoy it, my only ask is that you share it.
        </p>
        <SubscribeCTA />
      </section>

      {/* Strange But True */}
      <section style={{
        margin: '2rem 0',
        padding: '1.5rem',
        borderLeft: '3px solid var(--accent, #c084fc)',
        background: 'var(--bg-card, transparent)',
        borderRadius: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Strange but true</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
          <li style={{ lineHeight: 1.5 }}>
            I published some of the earliest &ldquo;furry&rdquo; fiction to reach print &mdash; before the genre had a shelf to sit on.
          </li>
          <li style={{ lineHeight: 1.5 }}>
            I helped define what people now call &ldquo;eggfic&rdquo; years before the term existed.
          </li>
          <li style={{ lineHeight: 1.5 }}>
            Nominated for an Ursa Major Award while still in high school.
          </li>
          <li style={{ lineHeight: 1.5 }}>
            My writing is archived in the <strong>Strong National Museum of Play</strong>.
          </li>
        </ul>
      </section>

      {/* Try These First */}
      <section style={{ margin: '2rem 0' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Try these first</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
          <li>
            <Link href="/bio" className="button-link" style={{ display: 'inline-block' }}>
              &rarr; Who I am
            </Link>
          </li>
          <li>
            <Link href="/blog" className="button-link" style={{ display: 'inline-block' }}>
              &rarr; What I write
            </Link>
          </li>
          <li>
            <Link href="/projects" className="button-link" style={{ display: 'inline-block' }}>
              &rarr; What I build
            </Link>
          </li>
          <li>
            <Link href="/resume" className="button-link" style={{ display: 'inline-block' }}>
              &rarr; Where I&rsquo;ve been
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
