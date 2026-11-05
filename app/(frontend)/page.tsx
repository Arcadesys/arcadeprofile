import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import BookActions from '@/app/components/BookActions';
import BookPurchaseBlock from '@/app/components/BookPurchaseBlock';
import StartReadingShelf from '@/app/components/StartReadingShelf';
import SubscriptionForm from '@/app/components/SubscriptionForm';
import { getBook } from '@/data/books';
import { SITE_NAME, SITE_PLATFORM_NAME } from '@/lib/site-brand';
import { getHomeReadingPicks } from '@/lib/reader-discovery';
import { SITE_URL } from '@/lib/site-url';

import styles from './home.module.css';

const estelle = getBook('estelles-children')!;
const book = getBook('this-is-what-i-do-for-fun')!;
const homepageDescription = 'Discover This is what I do for fun by Austen Tucker: eight stories, including Foxtails, only in the book. Read seven stories free, get Broomsticks with the newsletter, and explore more fiction and essays.';

export const metadata: Metadata = {
  title: 'This is what I do for fun',
  description: homepageDescription,
  openGraph: {
    title: `This is what I do for fun | ${SITE_NAME}`,
    description: homepageDescription,
    url: SITE_URL,
  },
  twitter: {
    title: `This is what I do for fun | ${SITE_NAME}`,
    description: homepageDescription,
  },
};

export default async function HomePage() {
  const readingPicks = await getHomeReadingPicks();

  return (
    <main id="arcades-home" className={styles.main}>
      <header className={styles.brandBar}>
        <Link className={styles.brandLockup} href="/" aria-label={`${SITE_PLATFORM_NAME} — ${SITE_NAME} home`}>
          <span>{SITE_PLATFORM_NAME}</span><b aria-hidden="true">/</b><strong>{SITE_NAME}</strong>
        </Link>
        <a className={styles.workWithMe} href="https://work.thearcades.me/?utm_source=thearcades&utm_medium=site&utm_campaign=professional_handoff&utm_content=home_header">
          Work with me <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className={styles.release} aria-labelledby="estelle-release-heading">
        {estelle.coverImage ? <Image className={styles.releaseCover} src={estelle.coverImage} alt={estelle.coverAlt ?? `Cover of ${estelle.title}.`} width={1024} height={1536} sizes="(max-width: 700px) 200px, 220px" priority /> : null}
        <div className={styles.releaseCopy}>
          <p className={styles.releaseDate}>Releases November 30, 2026</p>
          <h2 id="estelle-release-heading">Estelle&apos;s Children</h2>
          <p>A Chicago witch’s parlor. A growing sisterhood. A family history told as an archive.</p>
          <p>The ebook is available for preorder.</p>
          <BookActions book={estelle} purchaseOnly placement="home_estelle_preorder" />
          <Link className={styles.releaseDetails} href="/books/estelles-children">Explore Estelle&apos;s Children <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className={styles.hero} aria-labelledby="home-book-heading">
        <p className={styles.tagline}>Everything here used to be something else.</p>
        <BookPurchaseBlock
          book={book}
          headingId="home-book-heading"
          headingAs="h1"
          variant="hero"
          placement="home_hero"
          pitch="Strange lives, remade."
        />
      </section>

      <section className={styles.signup} aria-labelledby="home-signup-heading">
        <p className={styles.eyebrow}>A story for your inbox</p>
        <h2 id="home-signup-heading">Get <em>Broomsticks</em></h2>
        <p className={styles.signupCopy}>
          All Writing is the default for fiction and essays.
        </p>
        <SubscriptionForm
          source="home-hero"
          audiences={['all']}
          updateMode="add"
          magnet="subscriber-exclusive"
          presentation="compact"
          submitLabel="Get Broomsticks"
        />
      </section>

      <section className={styles.reading} aria-label="More ways to read">
        <StartReadingShelf
          items={readingPicks}
          heading="Start reading"
          headingId="home-start-reading"
          description="Three quick ways into the stories and essays."
          compact
          columns={3}
          analyticsPlacement="home_shelf"
        />
        <nav className={styles.readingLinks} aria-label="Browse writing">
          <Link href="/stories" data-analytics-placement="home_browse">All stories <span aria-hidden="true">→</span></Link>
          <Link href="/essays" data-analytics-placement="home_browse">All essays <span aria-hidden="true">→</span></Link>
        </nav>
      </section>

      <footer className={styles.footer}>
        <Link href="/about">About Austen</Link>
        <Link href="/books">All books</Link>
      </footer>
    </main>
  );
}
