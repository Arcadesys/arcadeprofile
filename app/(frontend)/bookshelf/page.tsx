import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import Image from 'next/image';
import Link from 'next/link';
import FreePlayColophon from '@/app/components/FreePlayColophon';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { BOOKS, bookPath, bookStatusLabel } from '@/data/books';

import styles from './bookshelf.module.css';

export const metadata: Metadata = {
  title: 'Bookshelf',
  description:
    'External publishing by Austen Crowder (also Slyford T. Rabbit, Sly Rabbit) — novels, short fiction, poetry, and essays from 2005 to the present.',
  alternates: { canonical: '/bookshelf' },
  openGraph: {
    type: 'article',
    title: `Bookshelf | ${SITE_NAME}`,
    description:
      'External publishing by Austen Crowder (also Slyford T. Rabbit, Sly Rabbit) — novels, short fiction, poetry, and essays from 2005 to the present.',
    url: '/bookshelf',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Bookshelf | ${SITE_NAME}`,
    description: 'External publishing under Austen Crowder, Slyford T. Rabbit, and Sly Rabbit.',
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
};

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function BookshelfPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Bookshelf</h1>
        <p>
Every book, and external publishing under three names from 2005 to
          the present — novels, short fiction, poetry, essays, and the occasional live performance. Pen names are grouped openly because the
          underlying author is the same person and that fact is already public.
        </p>
        <FreePlayColophon variant="lockup" size={200} />
      </header>

      <section className={styles.shelf} aria-labelledby="bookshelf-books-heading">
        <h2 id="bookshelf-books-heading">Books</h2>
        <ul>
          {BOOKS.map((book) => (
            <li key={book.slug}>
              {book.coverImage
                ? <Image className={styles.cover} src={book.coverImage} alt={book.coverAlt ?? `Cover of ${book.title}.`} width={600} height={900} sizes="(max-width: 720px) 60vw, 240px" />
                : <div className={styles.coverPlaceholder} aria-hidden="true"><span>{book.title}</span></div>}
              <div className={styles.bookCopy}>
                <p className={styles.bookMeta}>{book.format ?? 'Book'} · {bookStatusLabel(book)}</p>
                <h3><Link href={bookPath(book)}>{book.title}</Link></h3>
                {book.publisher ? <p className={styles.bookPublisher}>{book.publisher}</p> : null}
                <p className={styles.bookPublisher}>{book.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.shelfMore}><Link href="/books">Buy links and full details on the Books page <span aria-hidden="true">→</span></Link></p>
      </section>

      <section className={styles.group}>
        <h2>As Austen Crowder</h2>
        <div>
          <h3>Anthology contributions</h3>
          <ul>
            <li>
              <strong>&ldquo;Parts of the Whole&rdquo;</strong> in{' '}
              <em>Different Worlds, Different Skins, Vol. 2</em> (Will A. Sanborn, ed., Anthropomorphic
              Dreams Publishing, 2010).{' '}
              <Ext href="https://www.amazon.com/Different-Worlds-Different-Skins-Humanitys/dp/1456318977">Amazon</Ext>
              {' · '}
              <Ext href="https://www.goodreads.com/en/book/show/11078410">Goodreads</Ext>
              <br />
              <span className={styles.note}>
                The anthology was a 2010{' '}
                <Ext href="https://ursamajorawards.org/UMA_2010.htm">Ursa Major Award finalist</Ext>{' '}
                for Best Anthropomorphic Other Literary Work. Reprinted in <em>A Fuzzy Place</em>.
              </span>
            </li>
            <li>
              <strong>&ldquo;Carl&rdquo;</strong> in{' '}
              <em>Alone in the Dark: Anthropomorphic Tales of the Things That Go Bump in the Night</em>{' '}
              (Will A. Sanborn, ed., Anthropomorphic Dreams Publishing, 2008).{' '}
              <Ext href="https://www.amazon.com/Alone-Dark-Anthropomorphic-Tales-Things/dp/144043865X">Amazon</Ext>
              {' · '}
              <Ext href="http://www.anthrodreams.com/wordpress/2009/07/18/alone-in-the-dark/">publisher page</Ext>
            </li>
          </ul>

          <h3>Essays</h3>
          <ul>
            <li>
              <Ext href="http://bilerico.lgbtqnation.com/contributors/austen_crowder/">
                Contributor archive at The Bilerico Project
              </Ext>{' '}
              — 106 essays from March 2009 through December 2012 on LGBTQ politics, trans issues, gaming,
              and furry identity, now hosted by LGBTQ Nation.
              <br />
              <span className={styles.note}>
                Selected pieces:{' '}
                <Ext href="https://bilerico.lgbtqnation.com/2009/03/respect_versus_acceptance.php">Respect vs. Acceptance</Ext>
                {' · '}
                <Ext href="https://bilerico.lgbtqnation.com/2009/09/mind_the_gap_cross_the_valley.php">Mind the Gap, Cross the Valley</Ext>
                {' · '}
                <Ext href="http://bilerico.lgbtqnation.com/2009/10/inside_baseball_the_all-male_college_gay_problem.php">Inside Baseball: the all-male-college gay problem</Ext>
                {' · '}
                <Ext href="https://bilerico.lgbtqnation.com/2010/03/the_trans_mafia_stifles_allies.php">The &ldquo;Trans Mafia&rdquo; Stifles Allies</Ext>
                {' · '}
                <Ext href="https://bilerico.lgbtqnation.com/2010/07/an_interview_with_erin_vaught_about_her_experience.php">Interview with Erin Vaught</Ext>
                {' · '}
                <Ext href="https://bilerico.lgbtqnation.com/2010/01/nethacking_through_the_anti-lgbt_political_climate.php">Nethacking through the anti-LGBT political climate</Ext>
                .
              </span>
            </li>
            <li>
              <Ext href="http://adjectivespecies.com/2014/10/31/austen-writes-her-furry-story/">
                &ldquo;Austen Writes Her Furry Story&rdquo;
              </Ext>{' '}
              at [adjective][species] (October 2014). Also appears as a chapter in <em>A Fuzzy Place</em>.
            </li>
          </ul>

          <h3>Find me on</h3>
          <ul>
            <li>
              <Ext href="https://www.amazon.com/Austen-Crowder/e/B00IUJF5PI">Amazon author page</Ext>
            </li>
            <li>
              <Ext href="https://www.goodreads.com/author/show/4509394.Austen_Crowder">Goodreads author page</Ext>
            </li>
            <li>
              <Ext href="https://baddogbooks.com/product-cat/authors/austen-crowder/">Bad Dog Books author page</Ext>
            </li>
            <li>
              <Ext href="https://en.wikifur.com/wiki/Austen_Crowder">WikiFur — Austen Crowder</Ext>
            </li>
            <li>
              <Ext href="https://furrywritersguild.com/2015/02/15/member-spotlight-austen-crowder/">
                Furry Writers&apos; Guild — Member Spotlight (2015)
              </Ext>
            </li>
            <li>
              <Ext href="https://about.me/austencrowder">about.me/austencrowder</Ext>
            </li>
          </ul>
        </div>
      </section>

      {/* As Slyford T. Rabbit */}
      <section className={styles.group}>
        <h2>As Slyford T. Rabbit</h2>
        <div>
          <p className={styles.groupIntro}>
            Short fiction and poetry in <em>Anthro</em> magazine, 2006–2007.
          </p>

          <h3>Short fiction</h3>
          <ul>
            <li>
              <Ext href="http://anthrozine.com/stry/foxtails.html">&ldquo;Foxtails&rdquo;</Ext>{' '}
              — <em>Anthro</em> #13 (Sep/Oct 2007).
            </li>
          </ul>

          <h3>Poetry</h3>
          <ul>
            <li>
              &ldquo;Terry Never Came Back&rdquo; — <em>Anthro</em> #13 (Sep/Oct 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-3.html">ANTHROlogy THREE</Ext>
            </li>
            <li>
              &ldquo;Tryst Tail&rdquo; — <em>Anthro</em> #11 (May/Jun 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li>
              &ldquo;Childhood Memories&rdquo; — <em>Anthro</em> #10 (Mar/Apr 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li>
              &ldquo;Cat and Rabbit&rdquo; — <em>Anthro</em> #9 (Jan/Feb 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li>
              &ldquo;For Those Who Stand Apart&rdquo; — <em>Anthro</em> #8 (Nov/Dec 2006).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
          </ul>

          <h3>Live appearances</h3>
          <ul>
            <li>
              Writing Track participant, <strong>Mephit Fur Meet 2007</strong>.
            </li>
          </ul>

          <h3>Find me on</h3>
          <ul>
            <li>
              <Ext href="https://www.furaffinity.net/user/slyford">FurAffinity gallery (slyford)</Ext>
            </li>
            <li>
              <Ext href="http://en.wikifur.com/wiki/Slyford_T._Rabbit">WikiFur — Slyford T. Rabbit</Ext>
            </li>
          </ul>
        </div>
      </section>

      {/* As Sly Rabbit */}
      <section className={styles.group}>
        <h2>As Sly Rabbit</h2>
        <div>
          <ul>
            <li>
              <strong>&ldquo;Velveteen&rdquo;</strong> — live performance at the{' '}
              <strong>Midwest FurFest 2005 Variety Show</strong>. A sad tale of a plush bunny
              named Buster and his owner Max. No surviving recording is known.
            </li>
          </ul>

          <h3>Find me on</h3>
          <ul>
            <li>
              <Ext href="https://en.wikifur.com/wiki/Sly_Rabbit">WikiFur — Sly Rabbit</Ext>
            </li>
          </ul>
        </div>
      </section>

      <p className={styles.footnote}>
        Spotted a missing entry, a broken link, or a published piece I&apos;ve forgotten?{' '}
        <a href="mailto:austen.crowder@gmail.com">Email me</a>.
      </p>
    </main>
  );
}
