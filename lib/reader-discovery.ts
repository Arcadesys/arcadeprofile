import { COLLECTION, COLLECTION_PATH } from '@/lib/collection';
import { getAllPosts, buildPostUrlMap } from '@/lib/blog';
import { buildPostUrl } from '@/lib/post-url';
import { getZooChapter, ZOO_HERO } from '@/lib/zoo-collection';

export type DiscoveryReadingItem = {
  title: string;
  description: string;
  href: string;
  readingMinutes: number;
  kind: 'fiction' | 'essay';
  /** Real cover art when a selected piece has a public, accessible asset. */
  cover?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

function readingMinutes(text: string, wordsPerMinute = 225): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / wordsPerMinute));
}

/** Four varied, public entry points used wherever a reader can start here. */
export async function getStartReadingShelf(): Promise<readonly DiscoveryReadingItem[]> {
  const [posts, locations] = await Promise.all([getAllPosts(), buildPostUrlMap()]);
  const carl = COLLECTION.find((story) => story.slug === 'carl');
  const coldBoot = getZooChapter('cold-boot');
  const photograph = posts.find((post) => post.slug === 'the-photograph-of-a-river');
  const memory = posts.find((post) => post.slug === 'gist-memory-is-not-a-bug');

  if (!carl || !coldBoot || !photograph || !memory) {
    throw new Error('The starting reading shelf is missing a required public piece.');
  }

  const photographLocation = locations.get(photograph.slug);
  const memoryLocation = locations.get(memory.slug);
  if (!photographLocation || !memoryLocation) {
    throw new Error('The starting reading shelf is missing a required public route.');
  }

  return [
    {
      title: carl.title,
      description: carl.description,
      href: `${COLLECTION_PATH}/${carl.slug}`,
      readingMinutes: readingMinutes(carl.markdownBody ?? ''),
      kind: 'fiction',
      cover: {
        src: carl.cover.src,
        alt: carl.coverAlt,
        width: carl.cover.width,
        height: carl.cover.height,
      },
    },
    {
      title: coldBoot.title,
      description: coldBoot.description,
      href: coldBoot.path,
      readingMinutes: coldBoot.readingMinutes,
      kind: 'fiction',
      cover: {
        src: ZOO_HERO.url,
        alt: ZOO_HERO.alt,
        width: ZOO_HERO.width,
        height: ZOO_HERO.height,
      },
    },
    {
      title: photograph.title,
      description: photograph.excerpt,
      href: buildPostUrl(photographLocation.groupSlug, photograph.slug),
      readingMinutes: readingMinutes(photograph.markdownBody),
      kind: 'essay',
    },
    {
      title: memory.title,
      description: memory.excerpt,
      href: buildPostUrl(memoryLocation.groupSlug, memory.slug),
      readingMinutes: readingMinutes(memory.markdownBody),
      kind: 'essay',
    },
  ];
}
