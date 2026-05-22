import type { Metadata } from 'next';
import Link from 'next/link';
import FreePlayColophon from '@/app/components/FreePlayColophon';

export const metadata: Metadata = {
  title: 'Bibliography',
  description:
    'External publishing by Austen Crowder (also Slyford T. Rabbit, Sly Rabbit) — novels, short fiction, poetry, and essays from 2005 to the present.',
  alternates: { canonical: '/bibliography' },
  openGraph: {
    type: 'article',
    title: 'Bibliography | The Arcades',
    description:
      'External publishing by Austen Crowder (also Slyford T. Rabbit, Sly Rabbit) — novels, short fiction, poetry, and essays from 2005 to the present.',
    url: '/bibliography',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bibliography | The Arcades',
    description: 'External publishing under Austen Crowder, Slyford T. Rabbit, and Sly Rabbit.',
  },
};

const sectionHeadingStyle = {
  fontSize: '1.3rem',
  marginBottom: '1rem',
  color: 'var(--accent)',
  borderBottom: '1px solid var(--border)',
  paddingBottom: '0.5rem',
} as const;

const subHeadingStyle = {
  fontSize: '1rem',
  margin: '1.25rem 0 0.6rem',
  color: 'var(--accent)',
} as const;

const cardStyle = {
  padding: '1.25rem',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  marginBottom: '1rem',
} as const;

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
} as const;

const itemStyle = {
  marginBottom: '0.85rem',
  lineHeight: 1.6,
} as const;

const mutedStyle = {
  color: 'var(--fg-muted)',
} as const;

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function BibliographyPage() {
  return (
    <main style={{ maxWidth: '740px', margin: '0 auto', padding: 'clamp(1rem, 4vw, 2rem) 1rem' }}>
      <section style={{ marginBottom: '2.5rem', marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <FreePlayColophon variant="lockup" size={320} />
        </div>
        <h1 className="gaysparkles" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.5rem' }}>
          Bibliography
        </h1>
        <p style={{ ...mutedStyle, fontSize: '1rem', lineHeight: 1.7, margin: '0 0 0.75rem' }}>
          External publishing under three names, 2005 to the present — novels, short fiction, poetry,
          essays, and the occasional live performance. Pen names are grouped openly because the
          underlying author is the same person and that fact is already public.
        </p>
        <p style={{ fontSize: '0.9rem', margin: 0 }}>
          <Link href="/bio">← Back to bio</Link>
        </p>
      </section>

      {/* As Austen Crowder */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>As Austen Crowder</h2>
        <div style={cardStyle}>
          <h3 style={{ ...subHeadingStyle, marginTop: 0 }}>Books</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <strong>The Painted Cat</strong> (2015) — novel, Argyll Productions / FurPlanet.{' '}
              <Ext href="https://furplanet.com/shop/item.aspx?itemid=778">FurPlanet</Ext>
              {' · '}
              <Ext href="https://www.amazon.com/Painted-Cat-Austen-Crowder-ebook/dp/B00XGSJIKQ">Amazon</Ext>
              {' · '}
              <Ext href="https://en.wikifur.com/wiki/The_Painted_Cat">WikiFur</Ext>
              {' · '}
              <Ext href="https://dogpatch.press/2015/07/22/the-painted-cat-by-austen-crowder-book-review-by-fred-patten/">
                review by Fred Patten (Dogpatch Press)
              </Ext>
            </li>
            <li style={itemStyle}>
              <strong>A Fuzzy Place: Short Stories from a Life Shaped by Furry Subculture</strong> (2013) —
              short story collection.{' '}
              <Ext href="https://www.amazon.com/Fuzzy-Place-Stories-Shaped-Subculture-ebook/dp/B00H7K7EYQ">Amazon</Ext>
              {' · '}
              <Ext href="https://www.goodreads.com/author/show/4509394.Austen_Crowder">Goodreads</Ext>
              <br />
              <span style={{ ...mutedStyle, fontSize: '0.9rem' }}>
                Contains: Our Hope Chest; Dances; Counsel; Uploading; Parts of the Whole; Part and Parcel;
                The Day I Split in Two; Austen Writes Her Furry Story.
              </span>
            </li>
            <li style={itemStyle}>
              <strong>Bait and Switch</strong> (2010) — novel, Anthropomorphic Dreams Publishing.{' '}
              <Ext href="https://www.amazon.com/Bait-Switch-Austen-Crowder/dp/145631890X">Amazon (paperback)</Ext>
              {' · '}
              <Ext href="https://www.amazon.com/Bait-Switch-Austen-Crowder-ebook/dp/B004XD9WZO">Kindle</Ext>
              {' · '}
              <Ext href="https://www.lulu.com/shop/austen-crowder/bait-and-switch/paperback/product-13579576.html">Lulu</Ext>
              {' · '}
              <Ext href="https://www.goodreads.com/book/show/9902962-bait-and-switch">Goodreads</Ext>
              {' · '}
              <Ext href="https://www.barnesandnoble.com/w/bait-and-switch-austen-crowder/1029404749">B&amp;N</Ext>
              {' · '}
              <Ext href="http://www.anthrodreams.com/wordpress/2010/11/28/bait-and-switch/">publisher announcement</Ext>
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Anthology contributions</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <strong>&ldquo;Parts of the Whole&rdquo;</strong> in{' '}
              <em>Different Worlds, Different Skins, Vol. 2</em> (Will A. Sanborn, ed., Anthropomorphic
              Dreams Publishing, 2010).{' '}
              <Ext href="https://www.amazon.com/Different-Worlds-Different-Skins-Humanitys/dp/1456318977">Amazon</Ext>
              {' · '}
              <Ext href="https://www.goodreads.com/en/book/show/11078410">Goodreads</Ext>
              <br />
              <span style={{ ...mutedStyle, fontSize: '0.9rem' }}>
                The anthology was a 2010{' '}
                <Ext href="https://ursamajorawards.org/UMA_2010.htm">Ursa Major Award finalist</Ext>{' '}
                for Best Anthropomorphic Other Literary Work. Reprinted in <em>A Fuzzy Place</em>.
              </span>
            </li>
            <li style={itemStyle}>
              <strong>&ldquo;Carl&rdquo;</strong> in{' '}
              <em>Alone in the Dark: Anthropomorphic Tales of the Things That Go Bump in the Night</em>{' '}
              (Will A. Sanborn, ed., Anthropomorphic Dreams Publishing, 2008).{' '}
              <Ext href="https://www.amazon.com/Alone-Dark-Anthropomorphic-Tales-Things/dp/144043865X">Amazon</Ext>
              {' · '}
              <Ext href="http://www.anthrodreams.com/wordpress/2009/07/18/alone-in-the-dark/">publisher page</Ext>
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Essays</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <Ext href="http://bilerico.lgbtqnation.com/contributors/austen_crowder/">
                Contributor archive at The Bilerico Project
              </Ext>{' '}
              — 106 essays from March 2009 through December 2012 on LGBTQ politics, trans issues, gaming,
              and furry identity, now hosted by LGBTQ Nation.
              <br />
              <span style={{ ...mutedStyle, fontSize: '0.9rem' }}>
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
            <li style={itemStyle}>
              <Ext href="http://adjectivespecies.com/2014/10/31/austen-writes-her-furry-story/">
                &ldquo;Austen Writes Her Furry Story&rdquo;
              </Ext>{' '}
              at [adjective][species] (October 2014). Also appears as a chapter in <em>A Fuzzy Place</em>.
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Find me on</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <Ext href="https://www.amazon.com/Austen-Crowder/e/B00IUJF5PI">Amazon author page</Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="https://www.goodreads.com/author/show/4509394.Austen_Crowder">Goodreads author page</Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="https://baddogbooks.com/product-cat/authors/austen-crowder/">Bad Dog Books author page</Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="https://en.wikifur.com/wiki/Austen_Crowder">WikiFur — Austen Crowder</Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="https://furrywritersguild.com/2015/02/15/member-spotlight-austen-crowder/">
                Furry Writers&apos; Guild — Member Spotlight (2015)
              </Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="https://about.me/austencrowder">about.me/austencrowder</Ext>
            </li>
          </ul>
        </div>
      </section>

      {/* As Slyford T. Rabbit */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>As Slyford T. Rabbit</h2>
        <div style={cardStyle}>
          <p style={{ ...mutedStyle, lineHeight: 1.7, margin: '0 0 1rem' }}>
            Short fiction and poetry in <em>Anthro</em> magazine, 2006–2007.
          </p>

          <h3 style={{ ...subHeadingStyle, marginTop: 0 }}>Short fiction</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <Ext href="http://anthrozine.com/stry/foxtails.html">&ldquo;Foxtails&rdquo;</Ext>{' '}
              — <em>Anthro</em> #13 (Sep/Oct 2007).
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Poetry</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              &ldquo;Terry Never Came Back&rdquo; — <em>Anthro</em> #13 (Sep/Oct 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-3.html">ANTHROlogy THREE</Ext>
            </li>
            <li style={itemStyle}>
              &ldquo;Tryst Tail&rdquo; — <em>Anthro</em> #11 (May/Jun 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li style={itemStyle}>
              &ldquo;Childhood Memories&rdquo; — <em>Anthro</em> #10 (Mar/Apr 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li style={itemStyle}>
              &ldquo;Cat and Rabbit&rdquo; — <em>Anthro</em> #9 (Jan/Feb 2007).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
            <li style={itemStyle}>
              &ldquo;For Those Who Stand Apart&rdquo; — <em>Anthro</em> #8 (Nov/Dec 2006).{' '}
              <Ext href="http://anthrozine.com/site/anthrology-2.html">ANTHROlogy TWO</Ext>
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Live appearances</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              Writing Track participant, <strong>Mephit Fur Meet 2007</strong>.
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Find me on</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <Ext href="https://www.furaffinity.net/user/slyford">FurAffinity gallery (slyford)</Ext>
            </li>
            <li style={itemStyle}>
              <Ext href="http://en.wikifur.com/wiki/Slyford_T._Rabbit">WikiFur — Slyford T. Rabbit</Ext>
            </li>
          </ul>
        </div>
      </section>

      {/* As Sly Rabbit */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadingStyle}>As Sly Rabbit</h2>
        <div style={cardStyle}>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <strong>&ldquo;Velveteen&rdquo;</strong> — live performance at the{' '}
              <strong>Midwest FurFest 2005 Variety Show</strong>. A sad tale of a plush bunny
              named Buster and his owner Max. No surviving recording is known.
            </li>
          </ul>

          <h3 style={subHeadingStyle}>Find me on</h3>
          <ul style={listStyle}>
            <li style={itemStyle}>
              <Ext href="https://en.wikifur.com/wiki/Sly_Rabbit">WikiFur — Sly Rabbit</Ext>
            </li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <p style={{ ...mutedStyle, fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          Spotted a missing entry, a broken link, or a published piece I&apos;ve forgotten?{' '}
          <a href="mailto:austen.crowder@gmail.com">Email me</a>.
        </p>
      </section>
    </main>
  );
}
