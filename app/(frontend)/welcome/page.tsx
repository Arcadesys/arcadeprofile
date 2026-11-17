import type { Metadata } from 'next';

import { SITE_NAME } from '@/lib/site-brand';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { WORK_RESUME_URL } from '@/lib/work-resume';

import Image from 'next/image';
import { BOOKS, bookPath, bookStatusLabel } from '@/data/books';
import { SHELF_NAMES } from '@/data/bookshelf';
import styles from './welcome.module.css';

// Same profile the work site links to (work.thearcades.me lib/content.ts).
const LINKEDIN_URL = 'https://www.linkedin.com/in/austen-tucker-0968a914';

const description = 'Meet Austen Tucker: builder, leader, and writer. Explore professional work, books, stories, and ways to get in touch.';

export const metadata: Metadata = {
  title: 'Welcome · Austen Tucker',
  description,
  alternates: { canonical: '/welcome' },
  openGraph: {
    type: 'website',
    title: `Welcome · Austen Tucker | ${SITE_NAME}`,
    description,
    url: '/welcome',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Welcome · Austen Tucker',
    description,
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

// Keep this stable QR destination; the selections can change without reprinting cards.
const EMAIL = 'austen.crowder@gmail.com';

const destinations = [
  {
    title: 'Work with me',
    href: 'https://work.thearcades.me/',
    detail: 'AI enablement, transformation, and practical tools.',
  },
  {
    title: 'Books and stories',
    href: '/books',
    detail: 'Current books, what is coming next, and where to buy.',
  },
  {
    title: 'Read something now',
    href: '/writing',
    detail: 'Fiction, essays, and good places to begin.',
  },
  {
    title: 'Résumé',
    href: WORK_RESUME_URL,
    detail: 'Professional experience and selected work.',
  },
  {
    title: 'About Austen',
    href: '/bio',
    detail: 'The person behind the work.',
  },
] as const;

export default function WelcomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.site}>{SITE_NAME}</p>
        <h1>Austen Tucker</h1>
        <p className={styles.roles}>Builder · Leader · Writer</p>
        <p className={styles.welcome}>Welcome. If you found your way here from my card, here’s a place to pick up the conversation.</p>
      </header>

      <section className={styles.section} aria-labelledby="welcome-contact-heading">
        <h2 id="welcome-contact-heading">Get in touch</h2>
        <address className={styles.address}>
          <ul className={styles.list}>
            <li>
              <a href={LINKEDIN_URL} className={`${styles.button} ${styles.primary}`}>
                <span className={styles.buttonText}>
                  <span className={styles.buttonLabel}>Connect on LinkedIn</span>
                  <span className={styles.buttonDetail}>See my work history</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">↗</span>
              </a>
            </li>
            <li>
              <a href="mailto:austen.crowder@gmail.com" className={styles.button}>
                <span className={styles.buttonText}>
                  <span className={styles.buttonLabel}>Email me</span>
                  <span className={styles.buttonDetail}>{EMAIL}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </a>
            </li>
            <li>
              <a href="tel:+13127207820" className={styles.button}>
                <span className={styles.buttonText}>
                  <span className={styles.buttonLabel}>Call me</span>
                  <span className={styles.buttonDetail}>312.720.7820</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </address>
      </section>

      <section className={styles.section} aria-labelledby="welcome-next-heading">
        <h2 id="welcome-next-heading">Where would you like to go?</h2>
        <ul className={styles.destinations}>
          {destinations.map((item) => (
            <li key={item.href}>
              <a href={item.href} className={styles.row}>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{item.title}</span>
                  <span className={styles.rowDetail}>{item.detail}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-labelledby="welcome-bookshelf-heading">
        <h2 id="welcome-bookshelf-heading">My bookshelf</h2>
        <p className={styles.sectionIntro}>Every book, and what I&apos;ve published under three names since 2005: novels, short fiction, poetry, essays, and a live performance or two.</p>

        <h3 className={styles.shelfHeading}>Books</h3>
        <ul className={styles.books}>
          {BOOKS.map((book) => (
            <li key={book.slug} className={styles.book}>
              {book.coverImage
                ? <Image className={styles.cover} src={book.coverImage} alt={book.coverAlt ?? `Cover of ${book.title}.`} width={600} height={900} sizes="8rem" />
                : <span className={styles.coverPlaceholder} aria-hidden="true">{book.title}</span>}
              <span className={styles.bookText}>
                <a href={bookPath(book)} className={styles.bookTitle}>{book.title}</a>
                <span className={styles.bookStatus}>{book.format ?? 'Book'} · {bookStatusLabel(book)}</span>
                {book.publisher ? <span className={styles.bookDetail}>{book.publisher}</span> : null}
                <span className={styles.bookDetail}>{book.description}</span>
              </span>
            </li>
          ))}
        </ul>

        {SHELF_NAMES.map((group) => (
          <section key={group.slug} className={styles.shelfGroup} aria-labelledby={`welcome-shelf-${group.slug}`}>
            <h3 id={`welcome-shelf-${group.slug}`} className={styles.shelfHeading}>{group.name}</h3>
            {group.intro ? <p className={styles.sectionIntro}>{group.intro}</p> : null}
            {group.lists.map((list) => (
              <div key={list.heading}>
                <h4 className={styles.shelfSubheading}>{list.heading}</h4>
                <ul className={styles.entries}>
                  {list.entries.map((entry) => (
                    <li key={entry.title} className={styles.entry}>
                      <p className={styles.entryTitle}>{entry.title}</p>
                      <p className={styles.entryDetail}>{entry.detail}</p>
                      {entry.links?.length
                        ? (
                          <ul className={styles.entryLinks}>
                            {entry.links.map((link) => (
                              <li key={link.href}>
                                <a href={link.href} className={styles.entryLink}>
                                  {link.label}
                                  <span className={styles.linkArrow} aria-hidden="true"> ↗</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )
                        : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <h4 className={styles.shelfSubheading}>Find me on</h4>
            <ul className={styles.destinations}>
              {group.findMe.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.row}>
                    <span className={styles.rowTitle}>{link.label}</span>
                    <span className={styles.arrow} aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}
