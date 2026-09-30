import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import MarkdownPostBody from '@/app/components/MarkdownPostBody';
import ReaderTelemetry from '@/app/components/ReaderTelemetry';
import EndOfPieceSubscribe from '@/app/components/EndOfPieceSubscribe';
import ReadingContinuityTracker from '@/app/components/ReadingContinuityTracker';
import ReadingNextSteps from '@/app/components/ReadingNextSteps';
import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import { getZooChapter, ZOO_CHAPTERS, ZOO_COLLECTION_PATH, ZOO_COLLECTION_TITLE, ZOO_HERO } from '@/lib/zoo-collection';
import { getReadingCatalog } from '@/lib/reading-catalog';
import { SITE_URL } from '@/lib/site-url';

import styles from '../zoo.module.css';

type Props = { params: Promise<{ chapter: string }> };

export function generateStaticParams() {
  return ZOO_CHAPTERS.map((chapter) => ({ chapter: chapter.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chapter = getZooChapter((await params).chapter);
  if (!chapter) return {};
  const title = `${chapter.title} | ${ZOO_COLLECTION_TITLE}`;
  return {
    title,
    description: chapter.description,
    alternates: { canonical: chapter.path },
    openGraph: { type: 'article', title: `${title} | ${SITE_NAME}`, description: chapter.description, url: chapter.path, images: [{ url: ZOO_HERO.url, alt: ZOO_HERO.alt }] },
    twitter: { card: 'summary_large_image', title, description: chapter.description, images: [ZOO_HERO.url] },
  };
}

export default async function ZooChapterPage({ params }: Props) {
  const chapter = getZooChapter((await params).chapter);
  if (!chapter) notFound();
  const previous = ZOO_CHAPTERS[chapter.order - 2];
  const next = ZOO_CHAPTERS[chapter.order];
  const pageUrl = `${SITE_URL}${chapter.path}`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Chapter', name: chapter.title, headline: chapter.title,
    description: chapter.description, position: chapter.order, author: { '@id': `${SITE_URL}/#person` },
    url: pageUrl, isPartOf: { '@type': 'Book', name: ZOO_COLLECTION_TITLE, url: `${SITE_URL}${ZOO_COLLECTION_PATH}` },
    encoding: [{ '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: `${SITE_URL}${chapter.pdfPath}` }],
  };
  const readingCatalog = await getReadingCatalog();
  const readingPiece = readingCatalog.find((item) => item.canonicalPath === chapter.path)!;
  return (
    <main className={styles.main}>
      <JsonLd data={jsonLd} />
      <ReadingContinuityTracker piece={readingPiece} />
      <article className={styles.reader}>
        <Link className={styles.backLink} href={ZOO_COLLECTION_PATH}>← All {ZOO_CHAPTERS.length} chapters</Link>
        <header className={styles.readerHeader}>
          <p className={styles.eyebrow}>Chapter {chapter.order} of {ZOO_CHAPTERS.length}</p>
          <h1>{chapter.title}</h1>
          <p className={styles.byline}>By Austen Tucker</p>
          <p className={styles.description}>{chapter.description}</p>
          <p className={styles.meta}>{chapter.wordCount.toLocaleString('en-US')} words · about {chapter.readingMinutes} minutes</p>
          {chapter.slug === 'gallery-view' && (
            <p className={styles.description}>
              This is the novel’s Chapter 2 edition. A distinct portfolio edition is also available at{' '}
              <Link href="/portfolio/gallery-view">Gallery View</Link>.
            </p>
          )}
          <div className={styles.actions}>
            <a href={chapter.pdfPath}>Download the PDF of Chapter {chapter.order}: {chapter.title}</a>
          </div>
        </header>
        <div className={styles.body}><ReaderTelemetry key={readingPiece.canonicalPath} canonicalId={readingPiece.canonicalPath} contentType={readingPiece.contentType} placement="reader-body" destination="none"><MarkdownPostBody markdown={chapter.markdown} /></ReaderTelemetry></div>
        <ReadingNextSteps piece={readingPiece} catalog={readingCatalog} />
        <EndOfPieceSubscribe
          audience="fiction"
          source="zoo-chapter-end"
          kind="story"
          seriesTitle={ZOO_COLLECTION_TITLE}
          totalParts={ZOO_CHAPTERS.length}
          seriesActive
        />
        <nav className={styles.readerNav} aria-label="Chapter navigation">
          {previous ? <Link href={previous.path}>← Chapter {previous.order}: {previous.title}</Link> : <Link href={ZOO_COLLECTION_PATH}>← Collection</Link>}
          {next ? <Link href={next.path}>Chapter {next.order}: {next.title} →</Link> : <Link href={ZOO_COLLECTION_PATH}>Collection →</Link>}
        </nav>
      </article>
    </main>
  );
}
