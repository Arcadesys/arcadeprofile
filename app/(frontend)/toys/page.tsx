import type { Metadata } from 'next';

import ToyShelf from '@/app/components/toys/ToyShelf';
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
        <ToyShelf toys={TOY_CATALOG} />
      </section>
    </main>
  );
}
