import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-brand';
import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import { getReadingCatalog } from '@/lib/reading-catalog';
import StartReadingShelf from '@/app/components/StartReadingShelf';
import { getStartReadingShelf } from '@/lib/reader-discovery';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

import styles from './writing.module.css';

const description = 'Fiction, essays, and bibliography by Austen Tucker.';

export const metadata: Metadata = {
  title: 'Writing',
  description,
  alternates: { canonical: '/writing' },
  openGraph: { type: 'website', title: `Writing | ${SITE_NAME}`, description, url: '/writing', images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: `Writing | ${SITE_NAME}`, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
};

const doors = [
  { title: 'Fiction', href: '/stories', description: 'Stories, serial work, and downloadable editions.' },
  { title: 'Essays', href: '/essays', description: 'Notes on creativity, access, technology, and being human.' },
  { title: 'Bibliography', href: '/bibliography', description: 'Books and publications beyond this workshop.' },
] as const;

export default async function WritingPage() {
  const [shelf, catalog] = await Promise.all([getStartReadingShelf(), getReadingCatalog()]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p>The Arcades</p>
        <h1>Writing</h1>
        <span>Fiction, essays, and the work that led here.</span>
      </header>
      <ContinueReadingBanner availablePaths={catalog.map((piece) => piece.canonicalPath)} />
      <StartReadingShelf items={shelf} />
      <section className={styles.doors} aria-label="Browse writing sections">
        <h2>Browse the whole shelf</h2>
        {doors.map((door) => (
          <Link key={door.href} href={door.href}>
            <strong>{door.title}</strong>
            <span>{door.description}</span>
            <em>Enter <span aria-hidden="true">→</span></em>
          </Link>
        ))}
      </section>
    </main>
  );
}
