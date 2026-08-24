import Image from 'next/image';
import Link from 'next/link';

import type { FeaturedCollectionMetadata } from '@/lib/zoo-collection-meta';

import styles from './FeaturedCollectionCard.module.css';

type Props = {
  collection: FeaturedCollectionMetadata;
  placement: 'home' | 'stories';
};

export default function FeaturedCollectionCard({ collection, placement }: Props) {
  return (
    <section
      className={`${styles.feature} ${placement === 'home' ? styles.home : styles.stories}`}
      aria-labelledby={`featured-collection-${placement}`}
    >
      <div className={styles.coverFrame}>
        <Image
          className={styles.cover}
          src={collection.cover.url}
          alt={collection.cover.alt}
          width={collection.cover.width}
          height={collection.cover.height}
          sizes={placement === 'home' ? '(max-width: 720px) 90vw, 310px' : '(max-width: 720px) 90vw, 280px'}
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{collection.eyebrow}</p>
        <h2 id={`featured-collection-${placement}`}>{collection.title}</h2>
        <p className={styles.description}>{collection.description}</p>
        <p className={styles.details}>
          {collection.chapterCount} chapters <span aria-hidden="true">·</span>{' '}
          {collection.availability}
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={collection.path}>Explore the collection</Link>
          <Link className={styles.secondaryAction} href={collection.firstChapterPath}>Begin with Cold Boot</Link>
        </div>
      </div>
    </section>
  );
}
