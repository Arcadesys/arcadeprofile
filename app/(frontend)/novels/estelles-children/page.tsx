import type { Metadata } from 'next';
import Image from 'next/image';

import EstellesChildrenSignup from '@/app/components/EstellesChildrenSignup';
import { JsonLd } from '@/lib/structured-data';
import { SITE_NAME } from '@/lib/site-brand';

import styles from './estelles-children.module.css';

const path = '/novels/estelles-children';
const title = 'Estelle’s Children';
const description = 'A novel about witches, Chicago, survival, and the people who keep the door open.';
const formId = process.env.NEXT_PUBLIC_AC_ESTELLES_CHILDREN_FORM_ID;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    type: 'book',
    title: `${title} | ${SITE_NAME}`,
    description,
    url: path,
    images: [{ url: '/images/books/estelles-children-front.png', alt: 'Cover of Estelle’s Children, a dark magenta and black illustrated novel cover.', width: 1024, height: 1535 }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/images/books/estelles-children-front.png'] },
};

const archiveOpening = [
  'I never knew my mother. But if you ask me about my Mother, I’ll tell you the story of Lady Estelle Extravaganza, the fiercest witch who ever lived.',
  'Lady Estelle Extravaganza died in 2120, a hundred and fifty years old, aided by both magic and the love of the sisterhood she had built from the ashes of the post-Plague Years with little more than empathy and an open door. For the better part of a century she taught the witching ways to hundreds of trans folk who wandered through her modest magic parlor in sleepy Ravenswood, Chicago. They came: rich, poor, destitute, abused, loved, sometimes with nothing left to lose. No matter what there was always a hot bed and a shoulder to cry on in Estelle’s house before she’d lay down the tea: “Cryin’s over. Let’s work on the rest of your life.”',
  'It is fitting that Estelle passed on the fifteenth anniversary of Sylvia Rivera Day. I had the pleasure of attending her pre-death kiki in hospice, surrounded by a sisterhood I only knew in part. Scores of women came from all around the world, all lined up to hold her hand one last time.',
  'It was there, buffeted by the harsh, mechanical whine of an oxygen machine and an IV drip hissing into her body, that she produced the thick, leather-bound volume of handwritten pages from under her pillow, her eyes alight with fire. “The family history,” she said with a weak, sparkling smile, and pushed my hands tight to the embossed cover. “I know you’ll put it to good use.”',
  'Inside were her personal journals, printed-off email chains, handwritten letters, postcards, photos, maps of the magical ley lines that crisscrossed the land under our feet. A hundred years of magic, all of it kept in her own hand. Much of what lies beyond her pages I gathered myself, in interviews conducted long before death came for the women who sat for them — Estelle not least among them — and bound into this record only after they were gone. I have embellished many of the tales — flair and panache the bare record couldn’t carry — but I think she would have wanted it that way.',
  'Lady Estelle Extravaganza may have been meek and friendly, always happy to meet you halfway, but make no mistake: she raised an army, one awakened queer person at a time. She turned down gifts, gratitude, even positions of authority, choosing instead to end the ritual with a gentle smile, hands on shoulders, and eyes steeled with purpose. From her lips, a simple mandate:',
];

const broomsticksOpening = [
  'Broomsticks shared a storefront with a tiny Pagan shop off a quiet stop of Chicago’s Red Line. For most visitors the space contained bog-standard occult supplies: ritual books, incense, candles, even a shop cat named Lily who made friends with every new patron in the store. But if the stars were smiling on you, and you were tuned into the woven fabrics of magic that pulsed just out of sight, you’d find yourself at the premier magick shop of Chicago, where the needy could find the services of an actual, real-life witch for a decent price.',
  'But when the teen walked into the store, wearing a thrift-store androgynous top, hoodie, girl jeans, and a conveniently-not-quite-a-purse shoulder bag, Aria definitely took notice. It was in the way they shuffled through the store, head tilted to ratty rugs that covered distressed wood floors and dust-covered poultices on the bottommost shelves. It was in the way their arms crossed tight over the body, the way they jumped when floorboards creaked under their feet, the way they hugged the walls when they walked. Always on edge, ready to bolt at the slightest hint of disapproval.',
];

export default function EstellesChildrenPage() {
  return (
    <main className={styles.main}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: title,
        description,
        url: `${siteUrl}${path}`,
        author: { '@id': `${siteUrl}/#person` },
        image: `${siteUrl}/images/books/estelles-children-front.png`,
      }} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <Image
            className={styles.cover}
            src="/images/books/estelles-children-front.png"
            alt="Cover of Estelle’s Children, a dark magenta and black illustrated novel cover."
            width={1024}
            height={1535}
            sizes="(max-width: 720px) 82vw, 360px"
            priority
          />
          <div className={styles.intro}>
            <p className={styles.eyebrow}>An opening from the archive</p>
            <h1>{title}</h1>
            <p className={styles.lede}>{description}</p>
            <p className={styles.note}>This excerpt begins with Lady Claire Belfast’s archive note, then opens the door to Broomsticks.</p>
          </div>
        </header>

        <section className={styles.readerSignup} aria-labelledby="readers-heading">
          <div>
            <h2 id="readers-heading">Join Estelle’s Children Readers</h2>
            <p>Get six notes from inside the book over 24 days: the magic, the arguments, the people, and the House at the center. Confirm your email first; this is its own list, and you can leave it in one click.</p>
          </div>
          <EstellesChildrenSignup formId={formId} />
        </section>

        <article className={styles.excerpt} aria-labelledby="excerpt-heading">
          <p className={styles.eyebrow}>Excerpt</p>
          <h2 id="excerpt-heading">A Note from the Archive</h2>
          {archiveOpening.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <blockquote>“The cryin’s over. Welcome to the Sisterhood. Pass it on.”</blockquote>
          <p>The cryin’s just starting for us. But amidst our celebration and our grief, I invite you to remember the tears we shed, the laughs we shared, and the bonds we formed as Estelle’s children.</p>
          <p>It is now my turn to pass these on to you.</p>
          <p className={styles.signature}>In the name of the Sisterhood,<br />Lady Claire Belfast, Curator, National Magic Archives</p>
          <hr />
          <h2>Broomsticks</h2>
          <p className={styles.epigraph}>There wasn’t a lady in my graduating class who skipped out on Broomsticks. Nobody ever forgot the little ones who came off the street, hunched over as if trying to erase themselves from the world, and you were the only light in the middle of a deep, dark, tumbling sea.</p>
          <p className={styles.attribution}>~CB</p>
          {broomsticksOpening.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      </div>
    </main>
  );
}
