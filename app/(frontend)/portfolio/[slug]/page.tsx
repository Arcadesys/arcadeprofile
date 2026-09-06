import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import MarkdownPostBody from '@/app/components/MarkdownPostBody';
import ReaderTelemetry from '@/app/components/ReaderTelemetry';
import EndOfPieceSubscribe from '@/app/components/EndOfPieceSubscribe';
import ReadingContinuityTracker from '@/app/components/ReadingContinuityTracker';
import ReadingNextSteps from '@/app/components/ReadingNextSteps';
import ShareLinks from '@/app/components/ShareLinks';
import { COLLECTION_PATH, MOVED_FROM_PORTFOLIO } from '@/lib/collection';
import { getPortfolioWork, PORTFOLIO_WORKS } from '@/lib/portfolio';
import { getReadingCatalog } from '@/lib/reading-catalog';
import { JsonLd } from '@/lib/structured-data';
import { SITE_URL } from '@/lib/site-url';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PORTFOLIO_WORKS.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = getPortfolioWork(slug);
  // Moved slugs 301 at request time; no metadata to emit for them.
  if (!work) return {};

  const title = `${work.title} | Portfolio`;
  const path = `/portfolio/${work.slug}`;

  return {
    title,
    description: work.excerpt,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: `${title} | ${SITE_NAME}`,
      description: work.excerpt,
      url: path,
      images: [{
        url: work.titleImage.src,
        alt: work.titleImage.alt,
        width: work.titleImage.width,
        height: work.titleImage.height,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: work.excerpt,
      images: [work.titleImage.src],
    },
  };
}

export default async function PortfolioWorkPage({ params }: Props) {
  const { slug } = await params;

  // These six shipped at /portfolio/<slug> in #203 and may be indexed or
  // bookmarked. They now live in the collection; send them there permanently
  // rather than 404ing.
  if (MOVED_FROM_PORTFOLIO.includes(slug)) {
    permanentRedirect(`${COLLECTION_PATH}/${slug}`);
  }

  const work = getPortfolioWork(slug);
  if (!work) notFound();

  const pageUrl = `${SITE_URL}/portfolio/${work.slug}`;
  const storyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ShortStory',
    headline: work.title,
    name: work.title,
    description: work.excerpt,
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    url: pageUrl,
    wordCount: work.wordCount,
    image: work.titleImage.src,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Portfolio',
      url: `${SITE_URL}/portfolio`,
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'Portfolio', item: `${SITE_URL}/portfolio` },
      { name: work.title, item: pageUrl },
    ].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...item,
    })),
  };
  const readingCatalog = await getReadingCatalog();
  const readingPiece = readingCatalog.find((item) => item.canonicalPath === `/portfolio/${work.slug}`)!;

  return (
    <>
      <JsonLd data={storyJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <main className="dd-intro-main portfolio-reader">
        <article>
          <nav className="portfolio-reader__back" aria-label="Portfolio">
            <Link href="/portfolio">← Portfolio</Link>
          </nav>

          <header className="portfolio-reader__header">
            <p className="portfolio-eyebrow">Selected fiction</p>
            <h1>{work.title}</h1>
            <p className="portfolio-reader__byline">By Austen Tucker</p>
            <p className="portfolio-reader__meta">
              {work.wordCount.toLocaleString('en-US')} words · about {work.readingMinutes} minutes
            </p>
            {work.slug === 'gallery-view' && (
              <p className="portfolio-reader__meta">
                This is a distinct portfolio edition. Read the separate novel chapter in{' '}
                <Link href="/novels/it-takes-a-zoo/gallery-view">It Takes a Zoo</Link>.
              </p>
            )}
            <div className="portfolio-actions" aria-label="Download this work">
              <a href={work.downloads.pdf} target="_blank" rel="noreferrer">
                Read the PDF <span aria-hidden="true">↗</span>
              </a>
            </div>
          </header>

          <figure className="portfolio-reader__title-image">
            <Image
              src={work.titleImage.src}
              alt={work.titleImage.alt}
              width={work.titleImage.width}
              height={work.titleImage.height}
              sizes="(max-width: 720px) calc(100vw - 2rem), 680px"
              priority
            />
          </figure>

          <ReaderTelemetry key={readingPiece.canonicalPath} canonicalId={readingPiece.canonicalPath} contentType={readingPiece.contentType} placement="reader-body" destination="none"><MarkdownPostBody markdown={work.markdownBody} /></ReaderTelemetry>

          <ReadingContinuityTracker piece={readingPiece} />
          <ReadingNextSteps piece={readingPiece} catalog={readingCatalog} />

          <EndOfPieceSubscribe
            audience="fiction"
            source="portfolio-piece-end"
            kind="story"
          />

          <footer className="portfolio-reader__footer">
            <ShareLinks url={pageUrl} title={work.title} />
            <div className="portfolio-actions">
              <Link className="portfolio-read-link" href="/portfolio">
                ← All portfolio works
              </Link>
              <a href={work.downloads.pdf} target="_blank" rel="noreferrer">
                Read the PDF <span aria-hidden="true">↗</span>
              </a>
            </div>
          </footer>
        </article>
      </main>
    </>
  );
}
