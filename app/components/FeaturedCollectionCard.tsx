import Image from 'next/image';
import Link from 'next/link';

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
};

export default function FeaturedCollectionCard({ collection }: { collection: FeaturedCollection }) {
  return (
    <section className={styles.feature} aria-labelledby={`featured-collection-${collection.id}`}>
      <div className={styles.coverFrame}>
        <Image
          className={styles.cover}
          src={collection.cover.src}
          alt={collection.cover.alt}
          width={collection.cover.width}
          height={collection.cover.height}
          sizes="(max-width: 720px) 90vw, 280px"
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{collection.eyebrow}</p>
        <h2 id={`featured-collection-${collection.id}`}>{collection.title}</h2>
        <p className={styles.description}>{collection.description}</p>
        <p className={styles.details}>{collection.details}</p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={collection.primaryAction.href}>{collection.primaryAction.label}</Link>
          <Link className={styles.secondaryAction} href={collection.secondaryAction.href}>{collection.secondaryAction.label}</Link>
        </div>
      </div>
    </section>
  );
}
