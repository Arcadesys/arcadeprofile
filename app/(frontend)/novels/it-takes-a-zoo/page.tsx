import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';
import SubscriptionForm from '@/app/components/SubscriptionForm';
import {
  ZOO_CHAPTERS,
  ZOO_COLLECTION_DESCRIPTION,
  ZOO_COLLECTION_PATH,
  ZOO_COLLECTION_TITLE,
  ZOO_HERO,
} from '@/lib/zoo-collection';

import styles from './zoo.module.css';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: ZOO_COLLECTION_TITLE,
  description: ZOO_COLLECTION_DESCRIPTION,
  alternates: { canonical: ZOO_COLLECTION_PATH },
  openGraph: {
    type: 'website',
    title: `${ZOO_COLLECTION_TITLE} | ${SITE_NAME}`,
    description: ZOO_COLLECTION_DESCRIPTION,
    url: ZOO_COLLECTION_PATH,
    images: [{ url: ZOO_HERO.url, alt: ZOO_HERO.alt, width: ZOO_HERO.width, height: ZOO_HERO.height }],
  },
  twitter: { card: 'summary_large_image', title: ZOO_COLLECTION_TITLE, description: ZOO_COLLECTION_DESCRIPTION, images: [ZOO_HERO.url] },
};

export default function ZooCollectionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: ZOO_COLLECTION_TITLE,
    description: ZOO_COLLECTION_DESCRIPTION,
    url: `${SITE_URL}${ZOO_COLLECTION_PATH}`,
    author: { '@id': `${SITE_URL}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: ZOO_CHAPTERS.map((chapter) => ({
        '@type': 'ListItem', position: chapter.order, name: chapter.title, url: `${SITE_URL}${chapter.path}`,
      })),
    },
  };
  return (
    <main className={styles.main}>
      <JsonLd data={jsonLd} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <Image className={styles.cover} src={ZOO_HERO.url} alt={ZOO_HERO.alt} width={ZOO_HERO.width} height={ZOO_HERO.height} sizes="(max-width: 720px) 90vw, 400px" priority />
          <div>
            <p className={styles.eyebrow}>A novel-in-stories</p>
            <h1>{ZOO_COLLECTION_TITLE}</h1>
            <p className={styles.lede}>{ZOO_COLLECTION_DESCRIPTION}</p>
            <p>Jamie discovers the Zoo, a private virtual world where people choose their bodies and make room for each other. Follow its queer, furry found family through connected stories of art, grief, consent, and the work of building a place to belong.</p>
            <div className={styles.actions}>
              <Link href={ZOO_CHAPTERS[0].path}>Begin with Cold Boot</Link>
              <Link href="/projects/it-takes-a-zoo/it-takes-a-zoo-to-raise-the-child">Read the opening poem</Link>
            </div>
          </div>
        </header>

        <section className={styles.completeEdition} id="complete-pdf" aria-labelledby="complete-pdf-heading">
          <p className={styles.eyebrow}>Complete edition</p>
          <h2 id="complete-pdf-heading">Get the complete PDF</h2>
          <p>Subscribe to fiction and download all {ZOO_CHAPTERS.length} published chapters as one large-print, high-contrast edition. The opening poem remains separate. The combined PDF is a fixed edition; individual chapters may include later revisions.</p>
          <SubscriptionForm
            source="zoo-collection"
            audiences={['fiction']}
            updateMode="add"
            magnet="it-takes-a-zoo-complete"
            submitLabel="Subscribe to fiction and get the complete PDF"
            successMessage="You’re subscribed to fiction. Your complete PDF is ready."
          />
        </section>

        <section className={styles.chapters} aria-labelledby="chapters-heading">
          <h2 id="chapters-heading">Chapter editions</h2>
          <ol className={styles.chapterList}>
            {ZOO_CHAPTERS.map((chapter) => (
              <li className={styles.chapterCard} key={chapter.slug}>
                <span className={styles.chapterNumber} aria-hidden="true">{String(chapter.order).padStart(2, '0')}</span>
                <div>
                  <h3><Link href={chapter.path}>{chapter.title}</Link></h3>
                  <p>{chapter.description}</p>
                  <p>{chapter.wordCount.toLocaleString('en-US')} words · about {chapter.readingMinutes} minutes</p>
                  <div className={styles.cardActions}>
                    <Link href={chapter.path}>Read Chapter {chapter.order}: {chapter.title}</Link>
                    <a href={chapter.pdfPath}>Download the PDF of Chapter {chapter.order}: {chapter.title}</a>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
