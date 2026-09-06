import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import MarkdownPostBody from '@/app/components/MarkdownPostBody';
import ReaderTelemetry from '@/app/components/ReaderTelemetry';
import EndOfPieceSubscribe from '@/app/components/EndOfPieceSubscribe';
import ReadingContinuityTracker from '@/app/components/ReadingContinuityTracker';
import ReadingNextSteps from '@/app/components/ReadingNextSteps';
import { PieceActions } from '@/app/components/PieceActions';
import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE, getStory } from '@/lib/collection';
import { JsonLd } from '@/lib/structured-data';
import { getReadingCatalog } from '@/lib/reading-catalog';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COLLECTION.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};

  const title = `${story.title} | ${COLLECTION_TITLE}`;
  const path = `${COLLECTION_PATH}/${story.slug}`;

  return {
    title,
    description: story.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: `${title} | ${SITE_NAME}`,
      description: story.description,
      url: path,
      images: [{
        url: story.cover.src,
        alt: story.coverAlt,
        width: story.cover.width,
        height: story.cover.height,
      }],
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${SITE_NAME}`,
      description: story.description,
      images: [story.cover.src],
    },
  };
}

export default async function CollectionStoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const pageUrl = `${SITE_URL}${COLLECTION_PATH}/${story.slug}`;
  const storyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ShortStory',
    headline: story.title,
    name: story.title,
    description: story.description,
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    url: pageUrl,
    image: story.cover.src,
    isPartOf: {
      '@type': 'CollectionPage',
      name: COLLECTION_TITLE,
      url: `${SITE_URL}${COLLECTION_PATH}`,
    },
    encoding: [{
      '@type': 'MediaObject',
      encodingFormat: 'application/pdf',
      contentUrl: story.downloads.pdf,
    }],
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: COLLECTION_TITLE, item: `${SITE_URL}${COLLECTION_PATH}` },
      { name: story.title, item: pageUrl },
    ].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...item,
    })),
  };
  const readingCatalog = await getReadingCatalog();
  const readingPiece = readingCatalog.find((item) => item.canonicalPath === `${COLLECTION_PATH}/${story.slug}`);

  return (
    <>
      <JsonLd data={storyJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <main className="dd-intro-main portfolio-reader">
        <article>
          <nav className="portfolio-reader__back" aria-label={COLLECTION_TITLE}>
            <Link href={COLLECTION_PATH}>← All seven stories</Link>
          </nav>

          <header className="portfolio-reader__header">
            <p className="portfolio-eyebrow">{story.editionType}</p>
            <h1>{story.title}</h1>
            <p className="portfolio-reader__byline">By Austen Tucker</p>
            <p className="portfolio-reader__meta">{story.description}</p>
            <PieceActions
              title={story.title}
              readHref={`${COLLECTION_PATH}/${story.slug}`}
              pdfHref={`${COLLECTION_PATH}/${story.slug}/pdf`}
              shareUrl={pageUrl}
            />
          </header>

          <figure className="portfolio-reader__cover">
            <Image
              src={story.cover.src}
              alt={story.coverAlt}
              width={story.cover.width}
              height={story.cover.height}
              sizes="(max-width: 760px) calc(100vw - 2rem), 420px"
              priority
            />
          </figure>

          {story.playPath && (
            <section className="portfolio-reader__play" aria-labelledby="play-heading">
              <h2 id="play-heading">Play it in your browser</h2>
              <p>
                {story.title} branches. The PDF is a gamebook you follow by
                jumping between numbered sections; the browser version does the
                page-turning for you.
              </p>
              <Link href={story.playPath}>
                Play {story.title} <span aria-hidden="true">→</span>
              </Link>
            </section>
          )}

          {story.markdownBody && readingPiece && <ReaderTelemetry key={readingPiece.canonicalPath} canonicalId={readingPiece.canonicalPath} contentType={readingPiece.contentType} placement="reader-body" destination="none"><MarkdownPostBody markdown={story.markdownBody} /></ReaderTelemetry>}

          {readingPiece ? <><ReadingContinuityTracker piece={readingPiece} /><ReadingNextSteps piece={readingPiece} catalog={readingCatalog} /></> : null}

          <EndOfPieceSubscribe
            audience="fiction"
            source="collection-story-end"
            kind="story"
          />

          <footer className="portfolio-reader__footer">
            <div className="portfolio-actions">
              <Link className="portfolio-read-link" href={COLLECTION_PATH}>
                ← All seven stories
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </>
  );
}
