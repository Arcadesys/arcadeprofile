import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import BookActions from '@/app/components/BookActions';
import BookPurchaseBlock from '@/app/components/BookPurchaseBlock';
import ContinueReadingBanner from '@/app/components/ContinueReadingBanner';
import HomeFooterNav from '@/app/components/HomeFooterNav';
import StartReadingShelf from '@/app/components/StartReadingShelf';
import SubscriptionForm from '@/app/components/SubscriptionForm';
import { getBook } from '@/data/books';
import { SITE_NAME, SITE_PLATFORM_NAME, SITE_PROMISE, SITE_PROMISE_HEADLINE, SITE_PROMISE_LINE } from '@/lib/site-brand';
import { getHomeReadingPicks } from '@/lib/reader-discovery';
import { getReadingCatalog } from '@/lib/reading-catalog';
import { SITE_URL } from '@/lib/site-url';

import styles from './home.module.css';

const estelle = getBook('estelles-children')!;
const book = getBook('this-is-what-i-do-for-fun')!;
const homepageDescription = 'Strange fiction with heart by Austen Tucker. Everything here used to be something else. Find what to read next, get Carl free with the newsletter, and preorder Estelle\'s Children.';

export const metadata: Metadata = {
  title: SITE_PROMISE_HEADLINE.replace(/\.$/, ''),
  description: homepageDescription,
  openGraph: {
    title: `${SITE_PROMISE_HEADLINE.replace(/\.$/, '')} | ${SITE_NAME}`,
    description: homepageDescription,
    url: SITE_URL,
  },
  twitter: {
    title: `${SITE_PROMISE_HEADLINE.replace(/\.$/, '')} | ${SITE_NAME}`,
    description: homepageDescription,
  },
};

export default async function HomePage() {
  const [readingPicks, catalog] = await Promise.all([getHomeReadingPicks(), getReadingCatalog()]);

  return (
    <main id="arcades-home" className={styles.main}>
      <header className={styles.brandBar}>
        <Link className={styles.brandLockup} href="/" aria-label={`${SITE_PLATFORM_NAME} — ${SITE_NAME} home`}>
          <span>{SITE_PLATFORM_NAME}</span><b aria-hidden="true">/</b><strong>{SITE_NAME}</strong>
        </Link>
      </header>

      <section className={styles.promise} aria-labelledby="home-promise-heading">
        <h1 id="home-promise-heading">{SITE_PROMISE_HEADLINE}</h1>
        <p className={styles.tagline}>{SITE_PROMISE_LINE}</p>
      </section>

      <ContinueReadingBanner availablePaths={catalog.map((piece) => piece.canonicalPath)} />

      <section className={styles.reading} aria-label="What to read next">
        <StartReadingShelf
          items={readingPicks}
          heading="What to read next"
          headingId="home-start-reading"
          description="Three good places to start."
          compact
          columns={3}
          analyticsPlacement="home_shelf"
        />
        <nav className={styles.readingLinks} aria-label="Browse writing">
          <Link href="/latest" data-analytics-placement="home_browse">Everything, newest first <span aria-hidden="true">→</span></Link>
          <Link href="/stories" data-analytics-placement="home_browse">All stories <span aria-hidden="true">→</span></Link>
          <Link href="/essays" data-analytics-placement="home_browse">All essays <span aria-hidden="true">→</span></Link>
        </nav>
      </section>

      <section className={styles.release} aria-labelledby="estelle-release-heading">
        {estelle.coverImage ? <Image className={styles.releaseCover} src={estelle.coverImage} alt={estelle.coverAlt ?? `Cover of ${estelle.title}.`} width={900} height={1440} sizes="(max-width: 700px) 200px, 220px" /> : null}
        <div className={styles.releaseCopy}>
          <p className={styles.releaseDate}>Releases November 30, 2026</p>
          <h2 id="estelle-release-heading">Estelle&apos;s Children</h2>
          {estelle.synopsis?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p>The ebook is available for preorder.</p>
          <BookActions book={estelle} purchaseOnly placement="home_estelle_preorder" />
          <Link className={styles.releaseDetails} href="/books/estelles-children">Explore Estelle&apos;s Children <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className={styles.signup} aria-labelledby="home-signup-heading">
        <p className={styles.eyebrow}>A free story for your inbox</p>
        <h2 id="home-signup-heading">Get <em>Carl</em> free</h2>
        <p className={styles.signupCopy}>{SITE_PROMISE}</p>
        <SubscriptionForm
          source="home-hero"
          audiences={['all']}
          updateMode="add"
          magnet="carl"
          presentation="compact"
          submitLabel="Get Carl free"
        />
      </section>

      <section className={styles.hero} aria-labelledby="home-book-heading">
        <BookPurchaseBlock
          book={book}
          headingId="home-book-heading"
          headingAs="h2"
          variant="hero"
          placement="home_hero"
          pitch="Strange lives, remade."
        />
      </section>

      <footer className={styles.footer}>
        <HomeFooterNav />
      </footer>
    </main>
  );
}
