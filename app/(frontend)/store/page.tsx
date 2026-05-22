import type { Metadata } from 'next';
import Image from 'next/image';
import SubscribeCTA from '@/app/components/SubscribeCTA';

export const metadata: Metadata = {
  title: 'Store',
  description: 'Books by Austen Tucker-Crowder.',
  alternates: { canonical: '/store' },
  openGraph: {
    type: 'website',
    title: 'Store | Free Play Publishing',
    description: 'Books by Austen Tucker-Crowder.',
    url: '/store',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Store | Free Play Publishing',
    description: 'Books by Austen Tucker-Crowder.',
  },
};

type Book = {
  key: string;
  title: string;
  description: string;
  coverImage: string;
  buyLink: string;
  buyLabel: string;
};

const books: Book[] = [
  {
    key: 'baitandswitch',
    title: 'Bait and Switch',
    description:
      "In Fenton's world, some kids are toons. Some think the change is biological. Others think the change is social. But some kids turn into toons, and Fenton's father just wants it to stop. He's even built a Realist movement to ban toons from the real world, hoping that it will keep his own children from following in their estranged mother's cartoon footsteps. Tensions rise as the Realists lobby to get their ban set into law, and toons fight for their right to be themselves. Fenton's father knows he can count on his two boys to stand behind him and his dream of building a safe, toon-free reality. It's just too bad that Fenton's becoming a toon. Cover artwork by Dustin Friend.",
    coverImage: '/images/books/baitandswitch.jpg',
    buyLink:
      'https://www.amazon.com/Bait-Switch-Austen-Crowder/dp/145631890X',
    buyLabel: 'Buy on Amazon',
  },
  {
    key: 'thepaintedcat',
    title: 'The Painted Cat',
    description:
      "Janet lives in two worlds. In one, she is Miss Perch, teacher at a small school deep in the corn grids, helping kids who are turning into cartoon find their way out of town. In the other, she is Bunny Cat, and paints herself up to be the very same type of cartoon cat her small town has grown to hate. The wall separating those two worlds is starting to break down. Between rekindling a relationship with an old college flame and discovering how much she loves being Bunny Cat, her two worlds are starting to merge. When kids start getting sent away for turning toon she knows she can't stand on the sideline any longer.",
    coverImage: '/images/books/thepaintedcat.jpg',
    buyLink: 'https://furplanet.com/shop/item.aspx?itemid=778',
    buyLabel: 'Buy from FurPlanet',
  },
  {
    key: 'afuzzyplace',
    title: 'A Fuzzy Place',
    description:
      "A collection of furry fiction spanning ten years in and out of the fandom. Revised works from high school, stories from long nights at college, pieces that helped me escape the stresses of teaching, and even some memoir. These stories let me find my way through some tough times, express feelings I didn't want to admit were there, and ultimately find peace with an identity as a trans woman.",
    coverImage: '/images/books/afuzzyplace.jpg',
    buyLink:
      'https://www.amazon.com/Fuzzy-Place-Stories-Shaped-Subculture-ebook/dp/B00H7K7EYQ',
    buyLabel: 'Buy on Amazon',
  },
  {
    key: 'closetcats',
    title: 'Closet Cats',
    description:
      "Three romantic short stories about lesbians, trans people, catgirls, and dragons. Ginny's Magic: Evelyn lands a date with the catgirl from the next world over, and they take a little trip through Chicago's Boystown. Dragons in the Middle: Dave lands himself in a pickle after a one-night stand with a wishing dragoness. Closet Cat: stuck in a rut, Charlie's marriage depends on a collar and cat ears provided by a witch he knew in college.",
    coverImage: '/images/books/closetcats.jpg',
    buyLink:
      'https://www.amazon.com/Closet-Cats-Austen-Tucker-ebook/dp/B0B311T8P1',
    buyLabel: 'Buy on Amazon',
  },
];

export default function StorePage() {
  return (
    <div className="w-full px-4 py-8">
      <div
        className="austenbox"
        style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}
      >
        <h1 className="gaysparkles mb-3 text-center text-3xl font-bold">Store</h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
          Books by Austen Tucker-Crowder. Most are available on Amazon; one lives at FurPlanet.
        </p>

        <div style={{ maxWidth: '680px', margin: '0 auto 2.5rem' }}>
          <SubscribeCTA
            source="store-top"
            magnet="story"
            variant="compact"
            heading="Not sure where to start?"
            blurb="Join the list and I'll send La Ligne du Marais — a Paris noir short — first. If it lands, the books are waiting."
            buttonLabel="Send the story"
          />
        </div>

        <div className="space-y-6">
          {books.map((book) => (
            <article
              key={book.key}
              className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 md:flex-row"
            >
              <div className="w-full flex-shrink-0 md:w-1/4 lg:w-1/5">
                <Image
                  src={book.coverImage}
                  alt={`Cover for ${book.title}`}
                  width={300}
                  height={450}
                  className="h-auto w-full rounded-lg object-cover"
                />
              </div>

              <div className="flex flex-grow flex-col">
                <h2 className="mb-2 text-xl font-semibold text-[var(--fg)]">
                  {book.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-[var(--fg-muted)]">
                  {book.description}
                </p>
                <div className="mt-auto">
                  <a
                    href={book.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-link"
                  >
                    {book.buyLabel}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div style={{ maxWidth: '680px', margin: '3rem auto 0' }}>
          <SubscribeCTA
            source="store-bottom"
            magnet="story"
            variant="compact"
            heading="Want a taste before you buy?"
            blurb="Subscribe and I'll send La Ligne du Marais — a Paris noir short — to your inbox right now."
            buttonLabel="Send the story"
          />
        </div>
      </div>
    </div>
  );
}
