import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE } from '@/lib/collection';
import { JsonLd } from '@/lib/structured-data';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');
const DESCRIPTION =
  'Seven short stories by Austen Tucker, free to read and download as accessible PDF editions.';

export const metadata: Metadata = {
  title: COLLECTION_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: COLLECTION_PATH },
  openGraph: {
    type: 'website',
    title: `${COLLECTION_TITLE} | Free Play Publishing`,
    description: DESCRIPTION,
    url: COLLECTION_PATH,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${COLLECTION_TITLE} | Free Play Publishing`,
    description: DESCRIPTION,
  },
};

export default function CollectionPage() {
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
            Seven stories. Androids, kitsune, hypersleep pods, and the smallest
            casino in Paris. Every one is free to read as a PDF.
          </p>
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
        </ol>
      </main>
    </>
  );
}
