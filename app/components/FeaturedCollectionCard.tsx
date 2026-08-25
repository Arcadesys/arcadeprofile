import Image from 'next/image';
import Link from 'next/link';

import type { FeaturedCollectionMetadata } from '@/lib/zoo-collection-meta';

import styles from './FeaturedCollectionCard.module.css';

export type FeaturedCollection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string;
  cover: { src: string; alt: string; width: number; height: number };
  primaryAction: { href: string; label: string };
  secondaryAction: { href: string; label: string };
  purchaseAction?: { href: string };
  incentiveAction?: { href: string; label: string };
};

type Props = {
  collection: FeaturedCollectionMetadata | FeaturedCollection;
  placement: 'home' | 'stories';
};

function isPurchaseUrl(href: string | undefined): href is string {
  return Boolean(href && /^https:\/\//.test(href));
}

export default function FeaturedCollectionCard({ collection, placement }: Props) {
  const isGenericCollection = 'primaryAction' in collection;
  const headingId = isGenericCollection ? `featured-collection-${collection.id}` : `featured-collection-${placement}`;
  const details = isGenericCollection
    ? collection.details
    : `${collection.chapterCount} chapters · ${collection.availability}`;
  const cover = isGenericCollection
    ? collection.cover
    : {
      src: collection.cover.url,
      alt: collection.cover.alt,
      width: collection.cover.width,
      height: collection.cover.height,
    };
  const primaryAction = isGenericCollection
    ? collection.primaryAction
    : { href: collection.path, label: 'Explore the collection' };
  const secondaryAction = isGenericCollection
    ? collection.secondaryAction
    : { href: collection.firstChapterPath, label: 'Begin with Cold Boot' };
  const incentiveAction = collection.incentiveAction;

  return (
    <section
      className={`${styles.feature} ${placement === 'home' ? styles.home : styles.stories}`}
      aria-labelledby={headingId}
    >
      <div className={styles.coverFrame}>
        <Image
          className={styles.cover}
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes={placement === 'home' ? '(max-width: 720px) 90vw, 310px' : '(max-width: 720px) 90vw, 280px'}
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{collection.eyebrow}</p>
        <h2 id={headingId}>{collection.title}</h2>
        <p className={styles.description}>{collection.description}</p>
        <p className={styles.details}>{details}</p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={primaryAction.href}>{primaryAction.label}</Link>
          <Link className={styles.secondaryAction} href={secondaryAction.href}>{secondaryAction.label}</Link>
          {isPurchaseUrl(collection.purchaseAction?.href) ? <a className={styles.secondaryAction} href={collection.purchaseAction.href} target="_blank" rel="noreferrer">Buy the paperback <span aria-hidden="true">→</span></a> : null}
          {incentiveAction ? <Link className={styles.secondaryAction} href={incentiveAction.href}>{incentiveAction.label}</Link> : null}
        </div>
      </div>
    </section>
  );
}
