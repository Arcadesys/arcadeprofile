import Link from 'next/link';

import type { EditorialCatalogGroup, EditorialSection } from '@/lib/editorial-catalog';
import type { CollectionStory } from '@/lib/collection';
import { formatSiteDate } from '@/lib/site-time';
import styles from './EditorialIndex.module.css';

interface Props {
  section: EditorialSection;
  groups: EditorialCatalogGroup[];
  collection?: readonly CollectionStory[];
  collectionPath?: string;
}

const copy = {
  fiction: {
    eyebrow: 'Free Play Publishing / Fiction',
    title: 'Stories for strange little fires.',
    lede: 'Read serial fiction and short stories online. Every piece remains part of the living web edition, with downloadable editions where available.',
  },
  essays: {
    eyebrow: 'Free Play Publishing / Essays',
    title: 'Ideas worth sitting with.',
    lede: 'Essays on writing, accessibility, creativity, AI, and the strange business of being human while all the machinery changes.',
  },
} as const;

export default function EditorialIndex({ section, groups, collection, collectionPath }: Props) {
  const text = copy[section];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.lede}>{text.lede}</p>
      </header>

      {section === 'fiction' && collection && collectionPath ? (
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

      {groups.length > 0 ? (
        <ol className={styles.groupList}>
          {groups.map((group) => (
            <li key={group.slug} className={styles.group}>
              <header className={styles.groupHeader}>
                <div>
                  <h2 className={styles.groupTitle}><Link href={group.href}>{group.title}</Link></h2>
                  {group.description ? <p>{group.description}</p> : null}
                </div>
                <div className={styles.groupActions}>
                  <Link href={group.href}>View series</Link>
                </div>
              </header>
              <ol className={styles.pieces}>
                {group.posts.map((post) => (
                  <li key={String(post.id)} className={styles.piece}>
                    <p className={styles.pieceMeta}>{formatSiteDate(post.date)}</p>
                    <h3><Link href={post.href}>{post.title}</Link></h3>
                    {post.description ? <p>{post.description}</p> : null}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      ) : <p className={styles.empty}>No published {section === 'fiction' ? 'fiction' : 'essays'} yet. Check back soon.</p>}
    </main>
  );
}
