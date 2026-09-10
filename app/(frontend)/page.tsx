import Link from 'next/link';
import type { CSSProperties } from 'react';

import StartReadingShelf from '@/app/components/StartReadingShelf';
import { getStartReadingShelf } from '@/lib/reader-discovery';
import SubscriptionForm from '@/app/components/SubscriptionForm';
import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import ContinueToyBanner from '@/app/components/toys/ContinueToyBanner';
import FeaturedCollectionCard from '@/app/components/FeaturedCollectionCard';
import { PieceActions } from '@/app/components/PieceActions';
import { buildPostUrl } from '@/lib/post-url';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';
import { SITE_NAME, SITE_PLATFORM_NAME } from '@/lib/site-brand';
import { ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';
import { getReadingCatalog } from '@/lib/reading-catalog';

import styles from './home.module.css';

const RECENT_POSTS_MAX = 4;

export default async function HomePage() {
  const [posts, urlMap, readingCatalog, shelf] = await Promise.all([getAllPosts(), buildPostUrlMap(), getReadingCatalog(), getStartReadingShelf()]);
  const recentPosts = posts.filter((post) => urlMap.has(post.slug)).slice(0, RECENT_POSTS_MAX).map((post) => {
    const location = urlMap.get(post.slug)!;
    const href = buildPostUrl(location.groupSlug, post.slug);
    return { ...post, href, groupTitle: location.groupTitle };
  });

  return (
    <main id="arcades-home" className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.brandBar}>
          <Link className={styles.brandLockup} href="/" aria-label={`${SITE_PLATFORM_NAME} — ${SITE_NAME} home`}>
            <span>{SITE_PLATFORM_NAME}</span><b aria-hidden="true">/</b><strong>{SITE_NAME}</strong>
          </Link>
          <Link className={styles.topSubscribe} href="/subscribe">Subscribe</Link>
        </div>
        <div className={styles.heroEditorial}>
          <div className={styles.heroCopy}>
            <p className={styles.byline}>Stories by Austen Tucker</p>
            <h1 className={styles.title}>Read the strange little fire.</h1>
            <p className={styles.subhead}>Speculative fiction, essays, and build notes by Austen Tucker. New writing when it&rsquo;s ready. Free. One-click unsubscribe.</p>
            <p className={styles.professional}>Austen is a builder and AI transformation leader who helps teams make emerging tools useful in everyday work.</p>
            <div className={styles.heroActions}>
              <Link className={styles.button} href="/writing">Start Here <span aria-hidden="true">→</span></Link>
              <Link className={styles.latestLink} href="/latest">Latest <span aria-hidden="true">→</span></Link>
              <Link className={styles.latestLink} href="/bio">AI transformation work <span aria-hidden="true">→</span></Link>
            </div>
            <div className={styles.heroSignup} aria-label="Email signup">
              <SubscriptionForm
                source="home-hero"
                audiences={['all']}
                updateMode="add"
                magnet="story"
                presentation="compact"
                submitLabel="Send me new work"
              />
            </div>
          </div>
          <div className={styles.portrait}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/moxie/moxie-sitting-text-gaze.webp"
              alt="Moxie, an orange fox with purple glasses and a magenta forelock, sits and looks toward The Arcades' Lab title."
              width="1536"
              height="1024"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
      </header>

      <div className={styles.resume}>
        <ContinueReadingBanner availablePaths={readingCatalog.map((piece) => piece.canonicalPath)} />
        <ContinueToyBanner />
      </div>

      <StartReadingShelf items={shelf} heading="Choose your next read" headingId="home-start-reading" showCovers />

      <FeaturedCollectionCard collection={ZOO_FEATURED_COLLECTION} placement="home" />

      <section className={styles.bands} aria-label={`Explore ${SITE_NAME}`}>
        <article className={styles.band} style={{ '--band': 'var(--cyan)' } as CSSProperties}>
          <h2>Fiction</h2><p>Short stories, novellas, and complete reading paths for strange little fires.</p>
          <Link href="/stories">Read fiction <span aria-hidden="true">→</span></Link>
        </article>
        <article className={styles.band} style={{ '--band': 'var(--pink)' } as CSSProperties}>
          <h2>Essays</h2><p>Ideas, reflections, and dispatches from the weird and wonderful.</p>
          <Link href="/essays">Read essays <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <nav className={styles.secondaryExplore} aria-label="More from The Arcades">
        <Link href="/lab">Case studies</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/toys">Games</Link>
        <Link href="/store">Store</Link>
      </nav>

      <section className={styles.below}>
        <section className={styles.recent} aria-labelledby="recent-heading">
          <div className={styles.recentMoxie}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/moxie/moxie-walking.webp"
              alt="Moxie walks forward with an easy stride, her purple glasses and magenta forelock catching the neon light."
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
          </div>
          <h2 id="recent-heading">Latest</h2>
          {recentPosts.length ? <ol className={styles.recentList}>{recentPosts.map((post) => (
            <li className={styles.recentRow} key={post.slug}>
              <div><h3><Link href={post.href}>{post.title}</Link></h3><p>{post.groupTitle} · {formatSiteDate(post.date)}</p></div>
              <div className={styles.recentActions}><PieceActions title={post.title} readHref={post.href} pdfHref={`${post.href}/pdf`} shareUrl={post.href} showRead={false} /></div>
            </li>
          ))}</ol> : <p>No recent publications are available yet.</p>}
          <Link className={styles.button} href="/latest">View all latest writing <span aria-hidden="true">→</span></Link>
        </section>
      </section>
    </main>
  );
}
