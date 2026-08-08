import type { SerializedEditorState } from 'lexical';

import downloads from '@/data/portfolio-downloads.json';

import carl from '@/data/portfolio-content/carl.json';
import cleanupOnPodSix from '@/data/portfolio-content/cleanup-on-pod-six.json';
import laLigneDuMarais from '@/data/portfolio-content/la-ligne-du-marais.json';
import mrTroutsSlide from '@/data/portfolio-content/mr-trout-s-slide.json';
import ourHopeChest from '@/data/portfolio-content/our-hope-chest.json';
import partsOfTheWhole from '@/data/portfolio-content/parts-of-the-whole.json';

/**
 * "This is what I do for fun" — seven short stories, published individually.
 *
 * The bound compilation stays unlisted; only these seven editions are public,
 * and only as PDFs. EPUB and print are the paid tier, so nothing here links to
 * an EPUB. Files live on Vercel Blob at content-addressed URLs written by
 * `scripts/generate-portfolio-content.ts` into `data/portfolio-downloads.json`.
 */
export const COLLECTION_TITLE = 'This is what I do for fun';
export const COLLECTION_PATH = '/this-is-what-i-do-for-fun';

export interface CollectionStory {
  slug: string;
  title: string;
  description: string;
  editionType: 'Short story' | 'Interactive gamebook';
  coverAlt: string;
  /** Set when the story also exists as a playable browser toy. */
  playPath?: string;
  /** Absent for works with no linear reading order — see Butterfly.exe. */
  content?: SerializedEditorState;
  cover: { src: string; width: number; height: number };
  downloads: { pdf: string };
}

type StorySeed = Omit<CollectionStory, 'cover' | 'downloads'>;

function story(seed: StorySeed): CollectionStory {
  const record = (downloads as Record<string, {
    pdf: string;
    cover?: { url: string; width: number; height: number };
  }>)[seed.slug];

  if (!record) {
    throw new Error(
      `No download record for ${seed.slug}. Run \`npm run generate:portfolio\`.`,
    );
  }
  if (!record.cover) {
    throw new Error(`No cover art uploaded for ${seed.slug}.`);
  }

  return {
    ...seed,
    cover: {
      src: record.cover.url,
      width: record.cover.width,
      height: record.cover.height,
    },
    downloads: { pdf: record.pdf },
  };
}

/** Reading order as bound: Parts of the Whole closes the collection. */
export const COLLECTION: readonly CollectionStory[] = [
  story({
    slug: 'carl',
    title: 'Carl',
    description:
      'An aging Floor-Mart android is told it is time to turn himself in, but he has only ever known how to keep working.',
    editionType: 'Short story',
    coverAlt: 'Black ink emblem of an android face and cart wheel on cloth-white paper.',
    content: carl as SerializedEditorState,
  }),
  story({
    slug: 'butterfly-exe',
    title: 'Butterfly.exe',
    description:
      'An interactive-fiction story about uploading, grief, and what a copy of someone is worth.',
    editionType: 'Interactive gamebook',
    coverAlt: 'Black ink butterfly breaking into square digital fragments on cloth-white paper.',
    playPath: '/toys/butterfly-exe',
    // Deliberately no `content`: the branching passages have no linear order.
  }),
  story({
    slug: 'our-hope-chest',
    title: 'Our Hope Chest',
    description:
      'Siblings Heather and Xander use magical animal costumes to escape family upheaval until a public transformation forces their private refuge into the open.',
    editionType: 'Short story',
    coverAlt: 'Open black ink hope chest with animal ears and a tail emerging on cloth-white paper.',
    content: ourHopeChest as SerializedEditorState,
  }),
  story({
    slug: 'cleanup-on-pod-six',
    title: 'Cleanup on Pod Six',
    description:
      'A luddite janitor and an Amish teenager clean the waste beneath virtual-reality pods while debating whether Ubiq can save a resource-starved world.',
    editionType: 'Short story',
    coverAlt: 'Black ink hypersleep pod above an exclamation-point brushstroke on cloth-white paper.',
    content: cleanupOnPodSix as SerializedEditorState,
  }),
  story({
    slug: 'la-ligne-du-marais',
    title: 'La Ligne du Marais',
    description:
      'A gambler chases a rumor through Le Marais and finds the smallest casino in the world.',
    editionType: 'Short story',
    coverAlt: 'Black ink roulette wheel cut by a decisive diagonal line on cloth-white paper.',
    content: laLigneDuMarais as SerializedEditorState,
  }),
  story({
    slug: 'mr-trout-s-slide',
    title: 'Mr. Trout’s Slide',
    description:
      'A despairing Chicagoan follows a mysterious map to a lakeside Shifter and discovers that the route to Atlantis runs down a very unusual slide.',
    editionType: 'Short story',
    coverAlt: 'Black ink playground slide descending into a fish-shaped lake ripple on cloth-white paper.',
    content: mrTroutsSlide as SerializedEditorState,
  }),
  story({
    slug: 'parts-of-the-whole',
    title: 'Parts of the Whole',
    description:
      'When Audrey’s kitsune half awakens, Lance confronts conversion therapy, his Catholic family, and the life he wants with Steve.',
    editionType: 'Short story',
    coverAlt: 'Black ink fox mask split by a white fracture on cloth-white paper.',
    content: partsOfTheWhole as SerializedEditorState,
  }),
];

export function getStory(slug: string): CollectionStory | undefined {
  return COLLECTION.find((entry) => entry.slug === slug);
}

/** Slugs that moved off /portfolio when the collection got its own section. */
export const MOVED_FROM_PORTFOLIO: readonly string[] = COLLECTION.map((s) => s.slug);
