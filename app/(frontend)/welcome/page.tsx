import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import FreePlayColophon from '@/app/components/FreePlayColophon';
import { getBook } from '@/data/books';

import { SITE_NAME } from '@/lib/site-brand';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { WORK_RESUME_URL } from '@/lib/work-resume';

import styles from './welcome.module.css';

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
const featuredBook = getBook('this-is-what-i-do-for-fun')!;

export default function WelcomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.masthead}>
        <span>{SITE_NAME}</span>
        <span>Good to meet you.</span>
      </div>

      <header className={styles.ticket}>
        <div className={styles.ticketBody}>
          <p className={styles.eyebrow}>One card. A few possible worlds.</p>
          <h1>Austen Tucker</h1>
          <p className={styles.roles}>Builder · Leader · Writer</p>
          <p className={styles.intro}>Welcome. If you found your way here from my card, here’s a place to pick up the conversation.</p>
          <a className={styles.heroLink} href="mailto:austen.crowder@gmail.com">Say hello <span aria-hidden="true">↗</span></a>
        </div>
        <div className={styles.ticketStub}>
          <div className={styles.imprint}>
            <FreePlayColophon variant="mono" size={64} ariaLabel="Free Play Publishing mark" />
            <span>FREE PLAY<small>Publishing</small></span>
          </div>
          <div className={styles.stubMessage}>
            <span className={styles.eyebrow}>Keep this part</span>
            <p>Stay<br /><em>curious.</em></p>
          </div>
          <span className={styles.admission}>Admit one. Bring your wonder.</span>
        </div>
      </header>

      <section className={styles.destinations} aria-labelledby="welcome-next-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Choose your next chapter</p>
          <h2 id="welcome-next-heading">What brought you here?</h2>
        </div>
        <div className={styles.cards}>
          <a className={styles.card} href="https://work.thearcades.me/">
            <span className={styles.cardTop}><span>01 / Build</span><span aria-hidden="true">↗</span></span>
            <h3>Make it<br /><em>real.</em></h3>
            <p>AI enablement, transformation, and practical tools. Explore my professional work.</p>
            <span className={styles.action}>Work with me <span aria-hidden="true">→</span></span>
          </a>
          <Link className={styles.card} href="/books">
            <span className={styles.cardTop}><span>02 / Read</span><span aria-hidden="true">↗</span></span>
            <h3>Find another<br /><em>world.</em></h3>
            <p>Current books, upcoming releases, and the backlist, with links to buy and read.</p>
            <span className={styles.action}>Explore the books <span aria-hidden="true">→</span></span>
          </Link>
          <Link className={styles.card} href="/writing">
            <span className={styles.cardTop}><span>03 / Wander</span><span aria-hidden="true">↗</span></span>
            <h3>Follow a<br /><em>thought.</em></h3>
            <p>Fiction, essays, and places to begin. Take the scenic route through the writing.</p>
            <span className={styles.action}>Read something <span aria-hidden="true">→</span></span>
          </Link>
        </div>
      </section>

      <section className={styles.feature} aria-labelledby="welcome-book-heading">
        <Link className={styles.coverLink} href="/books/this-is-what-i-do-for-fun" aria-label={`Explore ${featuredBook.title}`}>
          <Image src={featuredBook.coverImage!} alt={featuredBook.coverAlt ?? `Cover of ${featuredBook.title}`} width={240} height={360} sizes="(max-width: 600px) 150px, 210px" />
        </Link>
        <div className={styles.featureCopy}>
          <p className={styles.eyebrow}>On the Free Play shelf</p>
          <h2 id="welcome-book-heading">{featuredBook.title}</h2>
          <p>{featuredBook.description}</p>
          <Link className={styles.textLink} href="/books/this-is-what-i-do-for-fun">Meet the book <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className={styles.more} aria-labelledby="welcome-more-heading">
        <h2 id="welcome-more-heading">The conversation doesn’t end here.</h2>
        <nav aria-label="More about Austen">
          <Link href={WORK_RESUME_URL}>Résumé <span aria-hidden="true">↗</span></Link>
          <Link href="/bio">About Austen <span aria-hidden="true">→</span></Link>
          <a href="mailto:austen.crowder@gmail.com">Email Austen <span aria-hidden="true">↗</span></a>
        </nav>
      </footer>
    </main>
  );
}
