import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-brand';

import styles from './estelles-children.module.css';

const title = "Estelle's Children";
const description =
  'A preview of a novel told as an archive: a Chicago witch’s parlor, a growing sisterhood, and the records of a family history.';
const path = '/novels/estelles-children';

export const metadata: Metadata = {
  title: `${title} — Preview`,
  description,
  alternates: { canonical: path },
  openGraph: {
    type: 'website',
    title: `${title} — Preview | ${SITE_NAME}`,
    description,
    url: path,
  },
  twitter: { card: 'summary', title: `${title} — Preview`, description },
};

export default function EstellesChildrenPreviewPage() {
  return (
    <main className={styles.main}>
      <article className={styles.preview}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/start">Start here</Link>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>A novel · preview</p>
          <h1>{title}</h1>
          <p className={styles.lede}>
            A Chicago witch’s parlor opens onto a sisterhood, recorded through oral histories,
            letters, journals, photographs, and the people who carry a family history forward.
          </p>
        </header>

        <section aria-labelledby="about-heading" className={styles.section}>
          <h2 id="about-heading">About this book</h2>
          <p>
            In Ravenswood, Lady Estelle Extravaganza welcomes trans folk who come to her magic
            parlor looking for shelter, understanding, and a way forward. The story takes the shape
            of an archive: a family history assembled from interviews and the records people leave
            with one another.
          </p>
        </section>

        <section aria-labelledby="preview-heading" className={styles.note}>
          <h2 id="preview-heading">Preview</h2>
          <p>
            This page is an introduction to <em>Estelle&apos;s Children</em>. It does not include the
            full book or a download.
          </p>
        </section>

        <p className={styles.backLink}><Link href="/start">Explore more writing and projects</Link></p>
      </article>
    </main>
  );
}
