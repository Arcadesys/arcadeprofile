import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BOOKS, bookPath, bookStatusLabel, getBook, type BookInfo } from '@/data/books';
import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';

import styles from '../books.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BOOKS.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) return {};

  const path = bookPath(book);
  const title = `${book.title} · Austen Tucker`;
  return {
    title,
    description: book.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'book',
      title: `${book.title} | ${SITE_NAME}`,
      description: book.description,
      url: path,
      images: book.coverImage
        ? [{ url: book.coverImage, alt: book.coverAlt ?? `Cover of ${book.title}.` }]
        : undefined,
    },
    twitter: {
      card: book.coverImage ? 'summary_large_image' : 'summary',
      title,
      description: book.description,
      images: book.coverImage ? [book.coverImage] : undefined,
    },
  };
}

function Cover({ book }: { book: BookInfo }) {
  return (
    <div className={styles.coverFrame}>
      {book.coverImage ? (
        <Image
          src={book.coverImage}
          alt={book.coverAlt ?? `Cover of ${book.title}.`}
          width={600}
          height={900}
          sizes="(max-width: 760px) 78vw, 340px"
          priority
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

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  const nextBook = book.nextSlug ? getBook(book.nextSlug) : undefined;
  const bookUrl = `${SITE_URL}${bookPath(book)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${bookUrl}#book`,
    name: book.title,
    description: book.description,
    url: bookUrl,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: bookUrl,
    ...(book.publisher
      ? { publisher: { '@type': 'Organization', name: book.publisher } }
      : {}),
    ...(book.series
      ? {
          isPartOf: {
            '@type': 'BookSeries',
            name: book.series,
            ...(book.seriesPosition ? { position: book.seriesPosition } : {}),
          },
        }
      : {}),
    ...(book.stage === 'available' && book.releaseYear
      ? { datePublished: String(book.releaseYear) }
      : {}),
  };

  const permanentHomeCopy =
    book.stage === 'development'
      ? 'This book is in development. Cover art, release details, and formats will collect here as they become real.'
      : book.stage === 'forthcoming'
        ? 'This is the permanent home for this edition. Release links and formats will appear here as publication gets closer.'
        : null;

  return (
    <main className={styles.main}>
      <JsonLd data={jsonLd} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/books">← All books</Link>
        </nav>

        <article className={styles.detailHero}>
          <div className={styles.detailCover}>
            <Cover book={book} />
          </div>
          <div className={styles.detailBody}>
            <p className={styles.status}>{bookStatusLabel(book)}</p>
            <h1>{book.title}</h1>
            <p className={styles.detailDescription}>{book.description}</p>

            <ul className={styles.metadata} aria-label="Book details">
              {book.format ? <li>{book.format}</li> : null}
              {book.publisher ? <li>{book.publisher}</li> : null}
              {book.series ? (
                <li>
                  {book.series}{book.seriesPosition ? ` · Book ${book.seriesPosition}` : ''}
                </li>
              ) : null}
            </ul>

            {book.editionNote ? <p className={styles.editionNote}>{book.editionNote}</p> : null}
            {permanentHomeCopy ? <p className={styles.permanentHome}>{permanentHomeCopy}</p> : null}

            {book.actions.length ? (
              <div className={styles.actions}>
                {book.actions.map((action) => (
                  action.external ? (
                    <a key={action.href} href={action.href} target="_blank" rel="noreferrer">
                      {action.label} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <Link key={action.href} href={action.href}>{action.label}</Link>
                  )
                ))}
              </div>
            ) : null}
          </div>
        </article>

        {nextBook ? (
          <aside className={styles.nextShelf} aria-labelledby="next-book-heading">
            <p className={styles.kicker}>Next on the shelf</p>
            <h2 id="next-book-heading">{nextBook.title}</h2>
            <p>{nextBook.description}</p>
            <Link href={bookPath(nextBook)}>Explore {nextBook.title} <span aria-hidden="true">→</span></Link>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
