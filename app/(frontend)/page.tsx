import Link from 'next/link';
import type { CSSProperties } from 'react';

import ActiveCampaignForm from '@/app/components/ActiveCampaignForm';
import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import ContinueToyBanner from '@/app/components/toys/ContinueToyBanner';
import { PieceActions } from '@/app/components/PieceActions';
import { buildPostUrl } from '@/lib/post-url';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';

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
    <main id="freeplay-home" className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.brandBar}>
          <Link className={styles.brandLockup} href="/" aria-label="ArcadeProfile — Free Play Publishing home">
            <span>ArcadeProfile</span><b aria-hidden="true">/</b><strong>Free Play Publishing</strong>
          </Link>
          <Link className={styles.topSubscribe} href="/subscribe">Subscribe</Link>
        </div>
        <div className={styles.heroCopy}>
          <h1 className={styles.title}>Free Play<br />Publishing</h1>
          <p className={styles.byline}>Stories by Austen Tucker</p>
          <p className={styles.tagline}>Read the strange little fire.</p>
          <div className={styles.heroActions}>
            <Link className={styles.button} href="/stories">Start Here <span aria-hidden="true">→</span></Link>
            <Link className={`${styles.button} ${styles.buttonAlt}`} href="/latest">Latest Stories <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className={styles.portrait}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/free-play-fox-hero.png" alt="A sleeping orange fox with purple glasses and a magenta feathered tuft." />
        </div>
      </header>

      <div className={styles.resume}>
        <ContinueReadingBanner />
        <ContinueToyBanner />
      </div>

      <section className={styles.bands} aria-label="Explore Free Play Publishing">
        <article className={styles.band} style={{ '--band': '#00e0f0' } as CSSProperties}>
          <h2>Fiction</h2><p>Short stories and novellas from the edges of the ordinary.</p>
          <Link href="/stories">Explore fiction <span aria-hidden="true">→</span></Link>
        </article>
        <article className={styles.band} style={{ '--band': '#ef36af' } as CSSProperties}>
          <h2>Essays</h2><p>Ideas, reflections, and dispatches from the weird and wonderful.</p>
          <Link href="/essays">Explore essays <span aria-hidden="true">→</span></Link>
        </article>
        <article className={styles.band} style={{ '--band': '#ff912d' } as CSSProperties}>
          <h2>The Arcades Lab</h2><p>Experiments in narrative, worldbuilding, and the future of storytelling.</p>
          <Link href="/lab">Enter the Lab <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section className={styles.below}>
        <section className={styles.recent} aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recently Published</h2>
          {recentPosts.length ? <ol className={styles.recentList}>{recentPosts.map((post) => (
            <li className={styles.recentRow} key={post.slug}>
              <div><h3><Link href={post.href}>{post.title}</Link></h3><p>{post.groupTitle} · {formatSiteDate(post.date)}</p></div>
              <div className={styles.recentActions}><PieceActions title={post.title} readHref={post.href} pdfHref={`${post.href}/pdf`} shareUrl={post.href} /></div>
            </li>
          ))}</ol> : <p>No recent publications are available yet.</p>}
          <Link className={styles.button} href="/latest">View all stories <span aria-hidden="true">→</span></Link>
        </section>
        <aside className={styles.subscribe} aria-labelledby="subscribe-heading">
          <h2 id="subscribe-heading">Read it as it arrives</h2>
          <p>New stories, essays, and experiments—delivered to your inbox.</p>
          <ActiveCampaignForm source="home-hero" magnet="story" presentation="compact" />
        </aside>
      </section>
    </main>
  );
}
