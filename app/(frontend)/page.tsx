import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';
import SubscribeCTA from '../components/SubscribeCTA';

export default async function HomePage() {
  let featuredGroups: { id: string | number; title: string; description?: string | null; slug?: string | null; href?: string | null; external?: boolean | null }[] = [];

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'groups',
      where: { homeHighlight: { equals: true } },
      limit: 10,
    });
    featuredGroups = result.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      slug: doc.slug,
      href: doc.href,
      external: doc.external,
    }));
  } catch {
    // fall through to empty list
  }
  return (
    <main style={{ position: 'relative', zIndex: 1, padding: 'clamp(1.5rem, 5vw, 4rem) 1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 2rem' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="Austen Tucker illustration"
          style={{ borderRadius: '12px', width: 'min(320px, 100%)', height: 'auto' }}
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

      {/* Current Projects */}
      {featuredGroups.length > 0 && (
        <section style={{ margin: '2rem 0' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Current projects</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
            {featuredGroups.map((group) => {
              const href = group.href ?? (group.slug ? `/projects/${group.slug}` : '/projects');
              return (
                <li key={String(group.id)}>
                  {group.external ? (
                    <a href={href} className="button-link" style={{ display: 'inline-block' }} target="_blank" rel="noopener noreferrer">
                      &rarr; {group.title}
                    </a>
                  ) : (
                    <Link href={href} className="button-link" style={{ display: 'inline-block' }}>
                      &rarr; {group.title}
                    </Link>
                  )}
                  {group.description && (
                    <p style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.875rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                      {group.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
