import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';
import StartHereCard from '../components/StartHereCard';
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
      {/* Hero: avatar + value-prop headline */}
      <header style={{ textAlign: 'center', margin: '0 0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 1.25rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.jpg"
            alt=""
            aria-hidden="true"
            style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--neon-pink)',
              boxShadow: '0 0 24px var(--glow-pink, rgba(255, 60, 172, 0.45))',
            }}
          />
        </div>
        <h1 className="gaysparkles" style={{ margin: '0 0 0.75rem' }}>The Arcades</h1>
        <p style={{
          fontSize: '1.05rem',
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
          margin: 0,
        }}>
          Serialized fiction in your inbox, every Monday, Wednesday, and Friday.
        </p>
      </header>

      {/* Entry funnel — give first-time visitors a single, voice-rich on-ramp */}
      <StartHereCard />

      {/* Above-the-fold subscribe + credibility */}
      <section id="subscribe" style={{ margin: '0 0 2.5rem', scrollMarginTop: '5rem' }}>
        <SubscribeCTA
          source="home-hero"
          magnet="story"
          eyebrow="Fiction by email · M / W / F"
          heading="Read it as it arrives"
          blurb="A Paris noir short to start, then one installment at a time — the way Dickens delivered serials and the early web delivered listservs."
        />
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--fg-muted)',
          textAlign: 'center',
          margin: '0.85rem 0 0',
          lineHeight: 1.5,
        }}>
          Ursa Major nominee · Archived in the{' '}
          <strong style={{ color: 'var(--fg)' }}>Strong National Museum of Play</strong>
        </p>
      </section>

      {/* Manifesto — tightened */}
      <section style={{ margin: '2.5rem 0' }}>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          I miss email lists. Not newsletters. Not funnels. Not algorithmic confetti.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '1rem' }}>
          I mean the old kind: serialized stories in your inbox, readers replying, people gathering around the same strange little fire. So I&rsquo;m bringing that back.
        </p>
        <p style={{ lineHeight: 1.75, margin: 0 }}>
          Read like we used to on listservs. Read like the Victorians did Dickens. Read like the internet can still be a place worth visiting.
        </p>
      </section>

      {/* Strange But True */}
      <section style={{
        margin: '2.5rem 0',
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
        <section style={{ margin: '2.5rem 0' }}>
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

      {/* Closing CTA — second chance for scrollers */}
      <section style={{ margin: '3rem 0 0' }}>
        <SubscribeCTA
          source="home-bottom"
          magnet="story"
          variant="compact"
          heading="Still here? Then this is for you."
          blurb="Three installments a week. Read at your own pace. Reply if something lands. Sign up now and I'll send a Paris noir short to kick things off."
          buttonLabel="Send me the story"
        />
      </section>
    </main>
  );
}
