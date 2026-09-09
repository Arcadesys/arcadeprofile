import Link from 'next/link';
import Image from 'next/image';
import FeaturedCollectionCard, { type FeaturedCollection } from '@/app/components/FeaturedCollectionCard';

import type { EditorialCatalogGroup, EditorialSection } from '@/lib/editorial-catalog';
import { formatSiteDate } from '@/lib/site-time';
import { SITE_NAME } from '@/lib/site-brand';
import styles from './EditorialIndex.module.css';

interface Props {
  section: EditorialSection;
  groups: EditorialCatalogGroup[];
  featuredCollections?: readonly FeaturedCollection[];
}

const copy = {
  fiction: {
    eyebrow: `${SITE_NAME} / Fiction`,
    title: 'Stories for strange little fires.',
    lede: 'Read serial fiction and short stories online. Every piece remains part of the living web edition, with downloadable editions where available.',
  },
  essays: {
    eyebrow: `${SITE_NAME} / Essays`,
    title: 'Ideas worth sitting with.',
    lede: 'Essays on writing, accessibility, creativity, AI, and the strange business of being human while all the machinery changes.',
  },
} as const;

export default function EditorialIndex({ section, groups, featuredCollections }: Props) {
  const text = copy[section];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.lede}>{text.lede}</p>
      </header>

      {section === 'fiction' ? featuredCollections?.map((collection) => (
        <FeaturedCollectionCard key={collection.id} collection={collection} />
      )) : null}

      {groups.length > 0 ? (
        <ol className={styles.groupList}>
          {groups.map((group) => (
            <li key={group.slug} className={styles.group}>
              <header className={styles.groupHeader}>
                {group.image ? (
                  <Link className={styles.groupCoverLink} href={group.href} aria-label={`Read ${group.title}`}>
                    <Image
                      className={styles.groupCover}
                      src={group.image}
                      alt={group.imageAlt ?? `Cover art for ${group.title}.`}
                      width={group.imageWidth ?? 1650}
                      height={group.imageHeight ?? 2550}
                      sizes="(max-width: 42rem) 8rem, 12rem"
                    />
                  </Link>
                ) : null}
                <div>
                  <h2 className={styles.groupTitle}><Link href={group.href}>{group.title}</Link></h2>
                  {group.description ? <p>{group.description}</p> : null}
                </div>
                <div className={styles.groupActions}>
                  <Link href={group.href}>View series</Link>
                </div>
              </header>
              {group.canonicalChapterCollection ? (
                <p className={styles.canonicalCollectionNote}>Six complete chapter editions, each with a PDF download.</p>
              ) : (
                <ol className={styles.pieces}>
                  {group.posts.map((post) => (
                    <li key={String(post.id)} className={styles.piece}>
                      <p className={styles.pieceMeta}>{formatSiteDate(post.date)}</p>
                      <h3><Link href={post.href}>{post.title}</Link></h3>
                      {post.description ? <p>{post.description}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      ) : !featuredCollections?.length ? (
        <p className={styles.empty}>No published {section === 'fiction' ? 'fiction' : 'essays'} yet. Check back soon.</p>
      ) : null}
    </main>
  );
}
