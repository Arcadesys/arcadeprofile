import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { TOY_CATALOG } from '@/data/toys/catalog';

import styles from './toys.module.css';

export const metadata: Metadata = {
  title: 'Toys',
  description:
    'Games, interactive stories, experiments, and strange little browser toys by Austen Tucker.',
  alternates: {
    canonical: '/toys',
  },
};

export default function ToysPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Toys</h1>
        <p>
          Games, interactive stories, experiments, and strange little things I
          made because I wanted to see what they would do.
        </p>
      </header>

      <section aria-labelledby="play-now" className={styles.shelf}>
        <h2 id="play-now">
          {TOY_CATALOG.length} {TOY_CATALOG.length === 1 ? 'toy' : 'toys'} ready
          to play
        </h2>
        <ul className={styles.toyGrid}>
          {TOY_CATALOG.map((toy, index) => (
            <li key={toy.id}>
              <Link className={styles.toyLink} href={toy.href}>
                <div className={styles.cover}>
                  {toy.image ? (
                    <Image
                      alt={toy.image.alt}
                      height={toy.image.height}
                      priority={index === 0}
                      sizes="(max-width: 700px) 100vw, 420px"
                      src={toy.image.src}
                      width={toy.image.width}
                    />
                  ) : (
                    <span aria-hidden="true" className={styles.coverFallback}>
                      {toy.title}
                    </span>
                  )}
                </div>
                <div className={styles.toyCopy}>
                  <div className={styles.toyMeta}>
                    <span>{toy.kind}</span>
                    <span>{toy.status}</span>
                  </div>
                  <h3>{toy.title}</h3>
                  <p>{toy.description}</p>
                  <strong>
                    Play this toy <span aria-hidden="true">→</span>
                  </strong>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
