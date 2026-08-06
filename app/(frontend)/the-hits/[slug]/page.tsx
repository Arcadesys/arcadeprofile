import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getHit, HITS, hitDownloads } from '@/lib/hits';
import { JsonLd } from '@/lib/structured-data';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return HITS.map((hit) => ({ slug: hit.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hit = getHit(slug);
  if (!hit) return {};

  const title = `${hit.title} | The Hits`;
  const path = `/the-hits/${hit.slug}`;
  return {
    title,
    description: hit.description,
    alternates: { canonical: path },
    openGraph: { type: 'article', title, description: hit.description, url: path },
    twitter: { card: 'summary', title, description: hit.description },
  };
}

export default async function HitPage({ params }: Props) {
  const { slug } = await params;
  const hit = getHit(slug);
  if (!hit) notFound();

  const downloads = hitDownloads(hit.slug);
  const pageUrl = `${SITE_URL}/the-hits/${hit.slug}`;
  const storyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ShortStory',
    headline: hit.title,
    name: hit.title,
    description: hit.description,
    author: { '@id': `${SITE_URL}/#person` },
    publisher: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    url: pageUrl,
    isPartOf: { '@type': 'CollectionPage', name: 'The Hits', url: `${SITE_URL}/the-hits` },
    encoding: [
      { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: `${SITE_URL}${downloads.pdf}` },
      { '@type': 'MediaObject', encodingFormat: 'application/epub+zip', contentUrl: `${SITE_URL}${downloads.epub}` },
    ],
  };

  return (
    <>
      <JsonLd data={storyJsonLd} />
      <main className="dd-intro-main hits-reader">
        <article>
          <nav className="hits-reader__back" aria-label="The Hits">
            <Link href="/the-hits">← All seven stories</Link>
          </nav>

          <header className="hits-reader__header">
            <p className="hits-reader__type">{hit.editionType}</p>
            <h1>{hit.title}</h1>
            <p className="hits-reader__byline">By Austen Tucker</p>
            <p className="hits-reader__description">{hit.description}</p>
          </header>

          <figure className="hits-reader__cover">
            <Image src={`/the-hits/${hit.slug}/cover.png`} alt={hit.coverAlt} width={1024} height={1536} sizes="(max-width: 760px) calc(100vw - 2rem), 620px" priority />
          </figure>

          {hit.playPath && (
            <section className="hits-reader__play" aria-labelledby="play-heading">
              <h2 id="play-heading">Play it in your browser</h2>
              <p>Butterfly.exe is also available as a browser-based interactive story.</p>
              <Link href={hit.playPath}>Play Butterfly.exe <span aria-hidden="true">→</span></Link>
            </section>
          )}

          <section className="hits-reader__downloads" aria-labelledby="downloads-heading">
            <h2 id="downloads-heading">Choose your edition</h2>
            <p>Both editions use large, high-contrast linked controls. The EPUB is best for e-readers; the PDF is ready to read in a browser.</p>
            <div className="hits-download-actions">
              <a href={downloads.pdf} target="_blank" rel="noreferrer">
                Read PDF <span aria-hidden="true">↗</span>
              </a>
              <a href={downloads.epub} download>
                Download EPUB <span aria-hidden="true">↓</span>
              </a>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
