import Link from 'next/link';

import FeaturedCollectionCard, { type FeaturedCollection } from '@/app/components/FeaturedCollectionCard';
import type { EditorialCatalogGroup, EditorialSection } from '@/lib/editorial-catalog';
import type { CollectionStory } from '@/lib/collection';
import type { PortfolioWork } from '@/lib/portfolio';
import { formatSiteDate } from '@/lib/site-time';
import { SITE_NAME } from '@/lib/site-brand';
import type { FeaturedCollectionMetadata } from '@/lib/zoo-collection-meta';
import styles from './EditorialIndex.module.css';

interface Props {
  section: EditorialSection;
  groups: EditorialCatalogGroup[];
  featuredCollection?: FeaturedCollectionMetadata;
  featuredCollections?: readonly FeaturedCollection[];
  collection?: readonly CollectionStory[];
  collectionPath?: string;
  portfolio?: readonly PortfolioWork[];
}

const copy = {
  fiction: {
    eyebrow: `${SITE_NAME} / Fiction`,
    title: 'Stories for strange little fires.',
    lede: 'Free short fiction and a serial novel — queer found family, furry shapeshifters, and speculative stories about surviving a hypercapitalist world. Read online, or download the PDF editions below.',
  },
  essays: {
    eyebrow: `${SITE_NAME} / Essays`,
    title: 'Ideas worth sitting with.',
    lede: 'Essays on writing, accessibility, creativity, AI, and the strange business of being human while all the machinery changes.',
  },
} as const;

export default function EditorialIndex({ section, groups, featuredCollection, featuredCollections, collection, collectionPath, portfolio }: Props) {
  const text = copy[section];
  const isEssayIndex = section === 'essays';

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.lede}>{text.lede}</p>
      </header>

      {isEssayIndex && groups.length > 0 ? (
        <nav className={styles.topicNav} aria-label="Essay topics">
          <span>Jump to a topic</span>
          <ul>
            {groups.map((group) => <li key={group.slug}><Link href={`#topic-${group.slug}`}>{group.title}</Link></li>)}
          </ul>
        </nav>
      ) : null}

      {section === 'fiction' ? featuredCollections?.map((collection) => (
        <FeaturedCollectionCard key={collection.id} collection={collection} placement="stories" />
      )) : null}

      {section === 'fiction' && featuredCollection ? (
        <FeaturedCollectionCard collection={featuredCollection} placement="stories" />
      ) : null}

      {section === 'fiction' && !featuredCollections?.length && collection && collectionPath ? (
        <section className={styles.collection} aria-labelledby="collection-heading">
          <h2 id="collection-heading">This is what I do for fun</h2>
          <p>A shelf of seven free stories: read their web editions or download the existing PDF editions.</p>
          <ol className={styles.collectionGrid}>
            {collection.map((story) => (
              <li key={story.slug} className={styles.collectionCard}>
                <h3><Link href={`${collectionPath}/${story.slug}`}>{story.title}</Link></h3>
                <p>{story.description}</p>
                <div className={styles.actions}>
                  <Link className={styles.action} href={`${collectionPath}/${story.slug}`}>Read online</Link>
                  <a className={styles.action} href={story.downloads.pdf}>Download PDF</a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {section === 'fiction' && portfolio?.length ? (
        <section className={styles.collection} aria-labelledby="portfolio-fiction-heading">
          <h2 id="portfolio-fiction-heading">Portfolio fiction</h2>
          <p>Selected fiction outside the collection, preserved as web and PDF editions.</p>
          <ol className={styles.collectionGrid}>
            {portfolio.map((work) => (
              <li key={work.slug} className={styles.collectionCard}>
                <h3><Link href={`/portfolio/${work.slug}`}>{work.title}</Link></h3>
                <p>{work.excerpt}</p>
                <div className={styles.actions}>
                  <Link className={styles.action} href={`/portfolio/${work.slug}`}>Read online</Link>
                  <a className={styles.action} href={work.downloads.pdf}>Download PDF</a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {groups.length > 0 ? (
        <ol className={styles.groupList}>
          {groups.map((group) => (
            <li key={group.slug} id={`topic-${group.slug}`} className={styles.group}>
              <header className={styles.groupHeader}>
                <div>
                  <h2 className={styles.groupTitle}><Link href={group.href}>{group.title}</Link></h2>
                  {group.description ? <p>{group.description}</p> : null}
                </div>
                <div className={styles.groupActions}>
                  <Link href={group.href}>{isEssayIndex ? `Read all ${group.posts.length}` : 'View series'}</Link>
                </div>
              </header>
              <ol className={styles.pieces}>
                {(isEssayIndex ? group.posts.slice(0, 3) : group.posts).map((post) => (
                  <li key={String(post.id)} className={styles.piece}>
                    <p className={styles.pieceMeta}>{formatSiteDate(post.date)}</p>
                    <h3><Link href={post.href}>{post.title}</Link></h3>
                    {post.description ? <p>{post.description}</p> : null}
                  </li>
                ))}
              </ol>
              {isEssayIndex && group.posts.length > 3 ? (
                <Link className={styles.completeLink} href={group.href}>See all {group.posts.length} essays in {group.title} <span aria-hidden="true">→</span></Link>
              ) : null}
            </li>
          ))}
        </ol>
      ) : section === 'essays' || (!collection?.length && !portfolio?.length) ? (
        <p className={styles.empty}>No published {section === 'fiction' ? 'fiction' : 'essays'} yet. Check back soon.</p>
      ) : null}
    </main>
  );
}
