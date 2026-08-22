import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import Link from 'next/link';

import { PORTFOLIO_WORKS } from '@/lib/portfolio';
import { JsonLd } from '@/lib/structured-data';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');
const DESCRIPTION =
  'Longform work by Austen Tucker, free to read online or download as an accessible PDF.';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: DESCRIPTION,
  alternates: { canonical: '/portfolio' },
  openGraph: {
    type: 'website',
    title: `Portfolio | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/portfolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Portfolio | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default function PortfolioPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Portfolio',
    description: DESCRIPTION,
    url: `${SITE_URL}/portfolio`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: PORTFOLIO_WORKS.map((work, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/portfolio/${work.slug}`,
        name: work.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="portfolio-index">
        <header className="portfolio-index__header">
          <p className="portfolio-eyebrow">Selected writing</p>
          <h1>Portfolio</h1>
          <p>{DESCRIPTION}</p>
        </header>

        <ol className="portfolio-list">
          {PORTFOLIO_WORKS.map((work, index) => (
            <li key={work.slug}>
              <article className="portfolio-card">
                <div className="portfolio-card__number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <Link
                  className="portfolio-card__image"
                  href={`/portfolio/${work.slug}`}
                  aria-label={`Read ${work.title}`}
                >
                  <Image
                    src={work.titleImage.src}
                    alt={work.titleImage.alt}
                    width={work.titleImage.width}
                    height={work.titleImage.height}
                    sizes="(max-width: 720px) calc(100vw - 2rem), 280px"
                  />
                </Link>
                <div className="portfolio-card__body">
                  <h2>
                    <Link href={`/portfolio/${work.slug}`}>{work.title}</Link>
                  </h2>
                  <p>{work.excerpt}</p>
                  <p className="portfolio-card__meta">
                    {work.wordCount.toLocaleString('en-US')} words · about {work.readingMinutes} minutes
                  </p>
                  <div className="portfolio-actions">
                    <Link className="portfolio-read-link" href={`/portfolio/${work.slug}`}>
                      Read online <span aria-hidden="true">→</span>
                    </Link>
                    <a href={work.downloads.pdf} target="_blank" rel="noreferrer">
                      PDF <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
