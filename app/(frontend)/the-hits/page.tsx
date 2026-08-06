import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { HITS } from '@/lib/hits';
import { JsonLd } from '@/lib/structured-data';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');
const DESCRIPTION = 'Seven selected stories by Austen Tucker, available in accessible PDF and EPUB editions.';

export const metadata: Metadata = {
  title: 'The Hits',
  description: DESCRIPTION,
  alternates: { canonical: '/the-hits' },
  openGraph: {
    type: 'website',
    title: 'The Hits | Free Play Publishing',
    description: DESCRIPTION,
    url: '/the-hits',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Hits | Free Play Publishing',
    description: DESCRIPTION,
  },
};

export default function HitsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The Hits',
    description: DESCRIPTION,
    url: `${SITE_URL}/the-hits`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: HITS.map((hit, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/the-hits/${hit.slug}`,
        name: hit.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="dd-intro-main hits-index">
        <header className="hits-index__header">
          <h1>The Hits</h1>
          <p>{DESCRIPTION}</p>
        </header>

        <ol className="hits-list">
          {HITS.map((hit, index) => (
            <li key={hit.slug}>
              <article className="hits-card">
                <div className="hits-card__number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <Link className="hits-card__cover" href={`/the-hits/${hit.slug}`} aria-label={`Open ${hit.title}`}>
                  <Image src={`/the-hits/${hit.slug}/cover.png`} alt={hit.coverAlt} width={1024} height={1536} sizes="(max-width: 760px) calc(100vw - 2rem), 220px" />
                </Link>
                <div className="hits-card__body">
                  <p className="hits-card__type">{hit.editionType}</p>
                  <h2><Link href={`/the-hits/${hit.slug}`}>{hit.title}</Link></h2>
                  <p>{hit.description}</p>
                  <Link className="hits-card__read" href={`/the-hits/${hit.slug}`}>
                    Choose a format <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
