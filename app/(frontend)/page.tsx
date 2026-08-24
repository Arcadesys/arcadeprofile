import Link from 'next/link';
import type { CSSProperties } from 'react';

import ActiveCampaignForm from '@/app/components/ActiveCampaignForm';
import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import ContinueToyBanner from '@/app/components/toys/ContinueToyBanner';
import FeaturedCollectionCard from '@/app/components/FeaturedCollectionCard';
import { PieceActions } from '@/app/components/PieceActions';
import { buildPostUrl } from '@/lib/post-url';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';
import { SITE_NAME, SITE_PLATFORM_NAME } from '@/lib/site-brand';
import { ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';

import styles from './home.module.css';

const RECENT_POSTS_MAX = 4;

export default async function HomePage() {
  const [posts, urlMap] = await Promise.all([getAllPosts(), buildPostUrlMap()]);
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
            <h1 className={styles.title}>The Arcades&apos; Lab</h1>
            <p className={styles.tagline}>Read the strange little fire.</p>
            <div className={styles.heroActions}>
              <Link className={styles.button} href="/stories">Start Here <span aria-hidden="true">→</span></Link>
              <Link className={`${styles.button} ${styles.buttonAlt}`} href="/latest">Latest Stories <span aria-hidden="true">→</span></Link>
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
        <aside className={styles.continuePanel} aria-labelledby="continue-heading">
          <h2 id="continue-heading">Continue Reading</h2>
          {recentPosts.length ? <ol className={styles.continueList}>{recentPosts.map((post, index) => (
            <li className={styles.continueCard} key={post.slug} data-accent={index === 0 ? 'pink' : 'cyan'}>
              <p>{post.groupTitle}</p>
              <h3><Link href={post.href}>{post.title}</Link></h3>
              <time dateTime={post.date}>{formatSiteDate(post.date)}</time>
            </li>
          ))}</ol> : <p>No recent publications are available yet.</p>}
        </aside>
      </header>

      <div className={styles.resume}>
        <ContinueReadingBanner />
        <ContinueToyBanner />
      </div>

      <FeaturedCollectionCard collection={ZOO_FEATURED_COLLECTION} placement="home" />

      <section className={styles.bands} aria-label={`Explore ${SITE_NAME}`}>
        <article className={styles.band} style={{ '--band': 'var(--cyan)' } as CSSProperties}>
          <h2>Fiction</h2><p>Short stories and novellas from the edges of the ordinary.</p>
          <Link href="/stories">Explore fiction <span aria-hidden="true">→</span></Link>
        </article>
        <article className={styles.band} style={{ '--band': 'var(--pink)' } as CSSProperties}>
          <h2>Essays</h2><p>Ideas, reflections, and dispatches from the weird and wonderful.</p>
          <Link href="/essays">Explore essays <span aria-hidden="true">→</span></Link>
        </article>
        <article className={styles.band} style={{ '--band': 'var(--accent)' } as CSSProperties}>
          <h2>Case Studies</h2><p>Real products, the systems behind them, and lessons earned while building them.</p>
          <Link href="/lab">Explore case studies <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section className={styles.below}>
        <aside className={styles.subscribe} aria-labelledby="subscribe-heading">
          <div className={styles.subscribeMoxie}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/moxie/moxie-sleeping.webp"
              alt="Moxie sleeps curled around her tail with her purple glasses resting on her face."
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
          </div>
          <h2 id="subscribe-heading">Read it as it arrives</h2>
          <p>New stories, essays, and experiments—delivered to your inbox.</p>
          <ActiveCampaignForm source="home-hero" magnet="story" presentation="compact" />
        </aside>
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
          <h2 id="recent-heading">Recently Published</h2>
          {recentPosts.length ? <ol className={styles.recentList}>{recentPosts.map((post) => (
            <li className={styles.recentRow} key={post.slug}>
              <div><h3><Link href={post.href}>{post.title}</Link></h3><p>{post.groupTitle} · {formatSiteDate(post.date)}</p></div>
              <div className={styles.recentActions}><PieceActions title={post.title} readHref={post.href} pdfHref={`${post.href}/pdf`} shareUrl={post.href} showRead={false} /></div>
            </li>
          ))}</ol> : <p>No recent publications are available yet.</p>}
          <Link className={styles.button} href="/latest">View all stories <span aria-hidden="true">→</span></Link>
        </section>
      </section>
    </main>
  );
}
