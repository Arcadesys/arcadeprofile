import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';
import {
  BOOKS,
  bookPath,
  bookStatusLabel,
  type BookInfo,
  type BookSection,
} from '@/data/books';

import styles from './books.module.css';

const description =
  'Books by Austen Tucker: current releases, forthcoming Free Play Publishing titles, and the backlist.';

export const metadata: Metadata = {
  title: 'Books',
  description,
  alternates: { canonical: '/books' },
  openGraph: {
    type: 'website',
    title: `Books by Austen Tucker | ${SITE_NAME}`,
    description,
    url: '/books',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Books by Austen Tucker',
    description,
  },
};

const sections: readonly {
  id: BookSection;
  title: string;
  description: string;
}[] = [
  {
    id: 'current',
    title: 'Available now',
    description: 'The current Free Play Publishing shelf.',
  },
  {
    id: 'next',
    title: 'Coming next',
    description: 'The next title on the publishing runway.',
  },
  {
    id: '2027',
    title: '2027',
    description: 'The Ink and Paint Trilogy and It Takes a Zoo.',
  },
  {
    id: 'development',
    title: 'In development',
    description: 'Further down the runway. These pages stay put while the books take shape.',
  },
  {
    id: 'backlist',
    title: 'Backlist',
    description: 'Earlier books that are still available.',
  },
];

function Cover({ book }: { book: BookInfo }) {
  return (
    <div className={styles.coverFrame}>
      {book.coverImage ? (
        <Image
          src={book.coverImage}
          alt={book.coverAlt ?? `Cover of ${book.title}.`}
          width={600}
          height={900}
          sizes="(max-width: 540px) 74vw, 290px"
        />
      ) : (
        <div className={styles.fallbackCover} aria-hidden="true">
          <span>{book.publisher ?? 'The Arcades'}</span>
          <strong>{book.title}</strong>
          <small>Austen Tucker</small>
        </div>
      )}
    </div>
  );
}

function BookCard({ book }: { book: BookInfo }) {
  const primaryAction = book.actions[0];
  return (
    <article className={styles.card}>
      <Link className={styles.coverLink} href={bookPath(book)}>
        <Cover book={book} />
      </Link>
      <p className={styles.status}>{bookStatusLabel(book)}</p>
      <h3><Link href={bookPath(book)}>{book.title}</Link></h3>
      {book.series ? (
        <p className={styles.series}>
          {book.series}{book.seriesPosition ? ` · Book ${book.seriesPosition}` : ''}
        </p>
      ) : null}
      <p>{book.description}</p>
      <div className={styles.actions}>
        <Link href={bookPath(book)}>View book</Link>
        {primaryAction ? (
          primaryAction.external ? (
            <a href={primaryAction.href} target="_blank" rel="noreferrer">
              {primaryAction.label} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          )
        ) : null}
      </div>
    </article>
  );
}

export default function BooksPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Books by Austen Tucker',
    description,
    url: `${SITE_URL}/books`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: BOOKS.map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: book.title,
        url: `${SITE_URL}${bookPath(book)}`,
      })),
    },
  };

  return (
    <main className={styles.main}>
      <JsonLd data={jsonLd} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.kicker}>Free Play Publishing · The Arcades</p>
          <h1>Books by Austen Tucker</h1>
          <p className={styles.lede}>
            New releases, forthcoming books, and the backlist. This is the permanent shelf:
            one place to see what is out, what is next, and what is still being built.
          </p>
          <p className={styles.imprint}>
            Free Play Publishing is Austen Tucker&apos;s independent publishing imprint.
            Individual book pages keep the same URL from first preview through publication.
          </p>
        </header>

        {sections.map((section) => {
          const sectionBooks = BOOKS.filter((book) => book.section === section.id);
          if (!sectionBooks.length) return null;
          return (
            <section className={styles.section} key={section.id} aria-labelledby={`books-${section.id}`}>
              <div className={styles.sectionHeader}>
                <h2 id={`books-${section.id}`}>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <div className={styles.grid}>
                {sectionBooks.map((book) => <BookCard key={book.slug} book={book} />)}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
