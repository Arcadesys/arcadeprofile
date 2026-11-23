import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';
import {
  BOOKS,
  booksByAvailability,
  bookPath,
  bookStatusLabel,
  type BookInfo,
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

function Cover({ book }: { book: BookInfo }) {
  return (
    <div className={styles.coverFrame}>
      {book.coverImage ? (
        <Image
          src={book.coverImage}
          alt={book.coverAlt ?? `Cover of ${book.title}.`}
          width={600}
          height={900}
          sizes="(max-width: 600px) 160px, 224px"
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
  const read = book.actions.find((action) => action.kind !== 'purchase' && !action.external);
  const purchase = book.actions.find((action) => action.kind === 'purchase');
  return (
    <article className={styles.card}>
      <Cover book={book} />
      <div>
        <p className={styles.status}>{bookStatusLabel(book)}</p>
        <h3><Link href={bookPath(book)}>{book.title}</Link></h3>
        {book.series ? (
          <p className={styles.series}>
            {book.series}{book.seriesPosition ? ` · Book ${book.seriesPosition}` : ''}
          </p>
        ) : null}
        <p>{book.description}</p>
        {book.author ? <p>Published as {book.author}</p> : null}
        {book.editionNote ? <p>{book.editionNote}</p> : null}
        {(read || purchase) && (
          <div className={styles.actions}>
            {read && <Link href={read.href}>{read.label}</Link>}
            {purchase && (
              <a href={purchase.href} target="_blank" rel="noreferrer">
                {purchase.label} <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function BooksPage() {
  const { released, upcoming } = booksByAvailability(BOOKS);
  const books = [...released, ...upcoming];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Books by Austen Tucker',
    description,
    url: `${SITE_URL}/books`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: books.map((book, index) => ({
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
          <div className={styles.actions}>
            <Link href="/novels/it-takes-a-zoo/cold-boot">
              Read chapter one free: Cold Boot
            </Link>
          </div>
          <p className={styles.imprint}>
            Free Play Publishing is Austen Tucker&apos;s independent publishing imprint.
            Individual book pages keep the same URL from first preview through publication.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="books-released">
          <div className={styles.sectionHeader}>
            <h2 id="books-released">Released books</h2>
            <p>Newest releases first. Books without a release date follow.</p>
          </div>
          <div className={styles.grid}>
            {released.map((book) => <BookCard key={book.slug} book={book} />)}
          </div>
        </section>
        <section className={styles.section} aria-labelledby="books-upcoming">
          <div className={styles.sectionHeader}>
            <h2 id="books-upcoming">Upcoming books</h2>
            <p>Forthcoming books and works in development, with the nearest dates first.</p>
          </div>
          <div className={styles.grid}>
            {upcoming.map((book) => <BookCard key={book.slug} book={book} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
