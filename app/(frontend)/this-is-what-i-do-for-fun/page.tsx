import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import Link from 'next/link';

import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE } from '@/lib/collection';
import { JsonLd } from '@/lib/structured-data';
import { SITE_URL } from '@/lib/site-url';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { getBook } from '@/data/books';
import BookPurchaseBlock from '@/app/components/BookPurchaseBlock';

const DESCRIPTION =
  'Read seven of the eight stories free. The book by Austen Tucker has all eight; Foxtails is only in the book.';

export const metadata: Metadata = {
  title: COLLECTION_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: COLLECTION_PATH },
  openGraph: {
    type: 'website',
    title: `${COLLECTION_TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: COLLECTION_PATH,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${COLLECTION_TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

export default function CollectionPage() {
  const book = getBook('this-is-what-i-do-for-fun')!;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: COLLECTION_TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}${COLLECTION_PATH}`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: COLLECTION.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}${COLLECTION_PATH}/${entry.slug}`,
        name: entry.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="dd-intro-main collection-index">
        <header className="collection-index__header">
          <h1>{COLLECTION_TITLE}</h1>
          <p className="collection-index__lede">
            Seven of the eight stories are free to read here and download as accessible PDFs.
            The book has all eight; <em>Foxtails</em> is only in the book.
            Androids, kitsune, hypersleep pods, and the smallest casino in Paris.
          </p>
          <BookPurchaseBlock book={book} headingId="collection-book-heading" heading="Get the complete collection" />
        </header>

        <ol className="collection-index__list">
          {COLLECTION.map((entry) => (
            <li key={entry.slug} className="collection-card">
              <Link
                className="collection-card__cover"
                href={`${COLLECTION_PATH}/${entry.slug}`}
                aria-hidden="true"
                tabIndex={-1}
              >
                <Image
                  src={entry.cover.src}
                  alt=""
                  width={entry.cover.width}
                  height={entry.cover.height}
                  sizes="(max-width: 760px) 40vw, 220px"
                />
              </Link>

              <div className="collection-card__body">
                <p className="collection-card__type">{entry.editionType}</p>
                <h2>
                  <Link href={`${COLLECTION_PATH}/${entry.slug}`}>{entry.title}</Link>
                </h2>
                <p className="collection-card__description">{entry.description}</p>
                <div className="collection-card__actions">
                  <Link href={`${COLLECTION_PATH}/${entry.slug}`}>
                    Read {entry.title}
                  </Link>
                  <a href={entry.downloads.pdf} target="_blank" rel="noreferrer">
                    PDF <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
          <li className="collection-card">
            <div className="collection-card__cover">
              <Image src={book.coverImage!} alt={book.coverAlt!} width={600} height={900} sizes="(max-width: 760px) 40vw, 200px" />
            </div>
            <div className="collection-card__body">
              <p className="collection-card__type">Only in the book</p>
              <h2>Foxtails</h2>
              <p className="collection-card__description">The eighth story is exclusive to the book. Get all eight in <em>{COLLECTION_TITLE}</em>.</p>
            </div>
          </li>
        </ol>
      </main>
    </>
  );
}
