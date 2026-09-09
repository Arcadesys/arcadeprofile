import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { books } from '@/data/books';
import { SITE_NAME } from '@/lib/site-brand';
import styles from './writing.module.css';

const description = 'Books, fiction, essays, and ongoing work by Austen Tucker.';
const FEATURED_BOOK_SLUGS = ['baitandswitch', 'thepaintedcat', 'afuzzyplace'] as const;

export const metadata: Metadata = {
  title: 'Writing', description, alternates: { canonical: '/writing' },
  openGraph: { type: 'website', title: `Writing | ${SITE_NAME}`, description, url: '/writing' },
};

export default function WritingPage() {
  return <main className={styles.main}>
    <header className={styles.header}><p>The Arcades</p><h1>Writing</h1><span>Books, fiction, essays, and work still arriving.</span></header>
    <section className={styles.doors} aria-label="Writing sections">
      <Link href="/stories"><strong>Fiction</strong><span>Stories, serial work, and downloadable editions.</span></Link>
      <Link href="/essays"><strong>Essays</strong><span>Notes on creativity, access, technology, and being human.</span></Link>
      <Link href="/bibliography"><strong>Bibliography</strong><span>Older publications and books beyond this workshop.</span></Link>
    </section>
    <section className={styles.books} aria-labelledby="books-heading">
      <div><h2 id="books-heading">Books</h2><Link href="/bibliography">Complete bibliography <span aria-hidden="true">→</span></Link></div>
      <ol>{FEATURED_BOOK_SLUGS.map((slug) => {
        const book = books[slug];
        return <li key={slug}>
        {book.coverImage ? <Image src={book.coverImage} alt={`Cover of ${book.title}.`} width={180} height={270} /> : null}
        <div><h3>{book.title}</h3><p>{book.description}</p>{book.buyLink ? <a href={book.buyLink} target="_blank" rel="noreferrer">{book.buyLabel ?? 'Learn more'} <span aria-hidden="true">→</span></a> : <Link href="/bibliography">Learn more <span aria-hidden="true">→</span></Link>}</div>
      </li>;
      })}</ol>
    </section>
  </main>;
}
