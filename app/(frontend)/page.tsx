import Link from 'next/link';

import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import ContinueToyBanner from '@/app/components/toys/ContinueToyBanner';
import FeaturedCollectionCard from '@/app/components/FeaturedCollectionCard';
import { buildPostDiscoveryUrl } from '@/lib/post-canonical';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { formatSiteDate } from '@/lib/site-time';
import { WORK_RESUME_PDF_URL, WORK_RESUME_URL } from '@/lib/work-resume';
import { ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';
import { getReadingCatalog } from '@/lib/reading-catalog';
import moxieHero480 from '@/public/images/moxie/moxie-sitting-text-gaze-480.webp';
import moxieHero960 from '@/public/images/moxie/moxie-sitting-text-gaze-960.webp';
import moxieHero1536 from '@/public/images/moxie/moxie-sitting-text-gaze.webp';

import styles from './home.module.css';

const RECENT_POSTS_MAX = 4;

export default async function HomePage() {
  const [posts, urlMap, readingCatalog] = await Promise.all([getAllPosts(), buildPostUrlMap(), getReadingCatalog()]);
  const recentPosts = posts.filter((post) => urlMap.has(post.slug)).slice(0, RECENT_POSTS_MAX).map((post) => {
    const location = urlMap.get(post.slug)!;
    const href = buildPostDiscoveryUrl(location.groupSlug, post.slug);
    return { ...post, href, groupTitle: location.groupTitle };
  });

  return (
    <main id="arcades-home" className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.byline}>Stories by Austen Tucker</p>
          <h1 className={styles.title}>Everything here used to be something else.</h1>
          <p className={styles.subhead}>Speculative fiction, essays, and build notes by Austen Tucker.</p>
          <div className={styles.heroActions}>
            <Link className={styles.button} href="/start">Start Here <span aria-hidden="true">→</span></Link>
            <Link className={styles.latestLink} href="/latest">Latest <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className={styles.portrait}>
          <picture>
            <source
              type="image/webp"
              srcSet={`${moxieHero480.src} 480w, ${moxieHero960.src} 960w, ${moxieHero1536.src} 1536w`}
              sizes="(max-width: 800px) 100vw, 35vw"
            />
            <img
              src={moxieHero960.src}
              alt="Moxie, an orange fox with purple glasses and a magenta forelock, sits and glances to the side."
              width="1536"
              height="1024"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>
      </header>

      <section className={styles.entryPaths} aria-labelledby="home-entry-paths-heading">
        <h2 id="home-entry-paths-heading">Choose what brought you here</h2>
        <ul>
          <li>
            <h3>Read fiction</h3>
            <p>Start <em>It Takes a Zoo</em> with “Cold Boot.”</p>
            <Link className={styles.entryPathAction} href="/novels/it-takes-a-zoo/cold-boot">Read Cold Boot <span aria-hidden="true">→</span></Link>
            <p className={styles.entryPathMore}><Link href="/stories">All fiction</Link></p>
          </li>
          <li>
            <h3>Read essays and columns</h3>
            <p>Begin with “The Safe Door,” a Queer Columns essay.</p>
            <Link className={styles.entryPathAction} href="/projects/queer-columns/the-safe-door">Read The Safe Door <span aria-hidden="true">→</span></Link>
            <p className={styles.entryPathMore}><Link href="/essays">All essays</Link></p>
          </li>
          <li>
            <h3>Explore professional work</h3>
            <p>See professional projects, case studies, and writing.</p>
            <a className={styles.entryPathAction} href="https://work.thearcades.me/?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_entry">
              Visit the work site <span aria-hidden="true">↗</span>
            </a>
            <p className={styles.entryPathMore}>
              <a href={WORK_RESUME_URL}>Read the resume</a>
              <a href={WORK_RESUME_PDF_URL}>Download PDF</a>
            </p>
          </li>
        </ul>
      </section>

      <div className={styles.resume}>
        <ContinueReadingBanner availablePaths={readingCatalog.map((piece) => piece.canonicalPath)} />
        <ContinueToyBanner />
      </div>

      <section className={styles.recent} aria-labelledby="recent-heading">
        <div className={styles.recentHeader}>
          <h2 id="recent-heading">Latest</h2>
          <Link className={styles.latestLink} href="/latest">View all latest writing <span aria-hidden="true">→</span></Link>
        </div>
        {recentPosts.length ? <ol className={styles.recentList}>{recentPosts.map((post) => (
          <li className={styles.recentRow} key={post.slug}>
            <p className={styles.recentMeta}>{post.groupTitle}<br />{formatSiteDate(post.date)}</p>
            <div>
              <h3><Link href={post.href}>{post.title}</Link></h3>
              {post.excerpt ? <p className={styles.recentExcerpt}>{post.excerpt}</p> : null}
            </div>
          </li>
        ))}</ol> : <p>No recent publications are available yet.</p>}
      </section>

      <FeaturedCollectionCard collection={ZOO_FEATURED_COLLECTION} placement="home" />
    </main>
  );
}
