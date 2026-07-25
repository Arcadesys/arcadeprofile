import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';
import StartHereCard from '../components/StartHereCard';
import ContinueReadingBanner from '../components/ContinueReadingBanner';
import ContinueToyBanner from '../components/toys/ContinueToyBanner';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { hasConfiguredDatabaseURL } from '@/lib/env';
import { buildGroupIntroUrl, buildPostUrl, getPostLocationBySlug } from '@/lib/post-url';
import { publicPostStatusWhere } from '@/lib/post-status';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';

const RECENT_POSTS_MAX = 4;
const HOME_TOYS = [...TOY_CATALOG].reverse().slice(0, 3);

export default async function HomePage() {
  let featuredGroups: { id: string | number; title: string; description?: string | null; slug?: string | null; href?: string | null; external?: boolean | null }[] = [];
  let startHereHref: string | null = null;
  let recentPosts: { slug: string; title: string; date: string; href: string; groupTitle: string }[] = [];

  if (hasConfiguredDatabaseURL()) {
    try {
      const payload = await getPayload({ config });
      const [groupsResult, startHereResult, allPosts, urlMap] = await Promise.all([
        payload.find({
          collection: 'groups',
          where: { homeHighlight: { equals: true } },
          limit: 10,
        }),
        payload.find({
          collection: 'posts',
          where: {
            and: [
              { 'discoverability.featured_on_start_here': { equals: true } },
              { publish_status: publicPostStatusWhere() },
            ],
          },
          sort: '-publishedDate',
          limit: 1,
          depth: 0,
          overrideAccess: true,
        }),
        getAllPosts(),
        buildPostUrlMap(),
      ]);
      featuredGroups = groupsResult.docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        slug: doc.slug,
        href: doc.href,
        external: doc.external,
      }));
      const startHereSlug = startHereResult.docs[0]?.slug as string | undefined;
      if (startHereSlug) {
        startHereHref = (await getPostLocationBySlug(payload, startHereSlug))?.url ?? null;
      }
      recentPosts = allPosts
        .filter((post) => urlMap.has(post.slug))
        .slice(0, RECENT_POSTS_MAX)
        .map((post) => {
          const loc = urlMap.get(post.slug)!;
          return {
            slug: post.slug,
            title: post.title,
            date: post.date,
            href: buildPostUrl(loc.groupSlug, post.slug),
            groupTitle: loc.groupTitle,
          };
        });
    } catch {
      // fall through to empty list / hidden card
    }
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
        <h1 className="gaysparkles" style={{ margin: '0 0 0.5rem' }}>Free Play Publishing</h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          margin: '0 0 0.75rem',
        }}>
          Stories by Austen Tucker
        </p>
        <p style={{
          fontSize: '1.05rem',
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
          margin: 0,
        }}>
          Serialized fiction by email — every installment as it lands.
        </p>
      </header>

      {/* Resume prompt for readers mid-series — highest priority for a returning
          visitor, so it sits above even the new-visitor on-ramp. */}
      <ContinueReadingBanner />
      <ContinueToyBanner />

      {/* Entry funnel — give first-time visitors a single, voice-rich on-ramp */}
      {startHereHref && <StartHereCard href={startHereHref} />}

      {/* Current Projects — the big picture before the ask: what's actually
          ongoing, so "subscribe" isn't the first thing a visitor sees. */}
      {featuredGroups.length > 0 && (
        <section style={{ margin: '0 0 2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Current projects</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
            {featuredGroups.map((group) => {
              const href = group.href ?? (group.slug ? buildGroupIntroUrl(group.slug) : '/projects');
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

      <section style={{ margin: '0 0 2.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>New toys</h2>
        <ul
          style={{
            display: 'grid',
            gap: '0.75rem',
            margin: '0 0 1rem',
            padding: 0,
            listStyle: 'none',
          }}
        >
          {HOME_TOYS.map((toy) => (
            <li key={toy.id}>
              <Link
                className="button-link"
                href={toy.href}
                style={{ display: 'block' }}
              >
                → {toy.title}
              </Link>
              <p
                style={{
                  margin: '0.25rem 0 0 1.25rem',
                  color: 'var(--fg-muted)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                {toy.description}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/toys"
          className="button-link"
          style={{ display: 'inline-block' }}
        >
          &rarr; Browse all {TOY_CATALOG.length} toys
        </Link>
      </section>

      {/* Recently published — concrete, dated proof of momentum */}
      {recentPosts.length > 0 && (
        <section style={{ margin: '0 0 2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Recently published</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
            {recentPosts.map((post) => (
              <li key={post.slug}>
                <Link href={post.href} className="button-link" style={{ display: 'inline-block' }}>
                  &rarr; {post.title}
                </Link>
                <p style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.875rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                  {post.groupTitle} · {formatSiteDate(post.date)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Credibility facts — the subscribe ask itself now lives only in the
          footer (one form per page instead of three), but these bio facts
          stay as a standalone block. */}
      <section style={{ margin: '0 0 2.5rem' }}>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: '0.4rem',
          fontSize: '0.78rem',
          color: 'var(--fg-muted)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          <li>
            Published some of the earliest &ldquo;furry&rdquo; fiction in print &mdash; before the genre had a shelf.
          </li>
          <li>
            Helped define &ldquo;eggfic,&rdquo; years before the term existed.
          </li>
          <li>
            Ursa Major Award nominee, while still in high school.
          </li>
          <li>
            Archived in the{' '}
            <strong style={{ color: 'var(--fg)' }}>Strong National Museum of Play</strong>.
          </li>
        </ul>
      </section>

      {/* Manifesto — de-emphasized: still here for anyone reading this far,
          but no longer the first thing after the hero. */}
      <section style={{ margin: '2.5rem 0' }}>
        <h2 style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          marginBottom: '1rem',
        }}>
          Why
        </h2>
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
    </main>
  );
}
