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
  const rabies = posts.find((post) => post.slug === 'rabies-capitalism');
  const memory = posts.find((post) => post.slug === 'gist-memory-is-not-a-bug');

  if (!carl || !coldBoot || !rabies || !rabies.hero || !memory || !memory.hero) {
    throw new Error('The starting reading shelf is missing a required public piece.');
  }

  const rabiesLocation = locations.get(rabies.slug);
  const memoryLocation = locations.get(memory.slug);
  if (!rabiesLocation || !memoryLocation) {
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
      title: rabies.title,
      description: rabies.excerpt,
      href: buildPostUrl(rabiesLocation.groupSlug, rabies.slug),
      readingMinutes: readingMinutes(rabies.markdownBody),
      kind: 'essay',
      cover: {
        src: rabies.hero.src,
        alt: rabies.hero.alt,
        width: 1024,
        height: 1536,
      },
    },
    {
      title: memory.title,
      description: memory.excerpt,
      href: buildPostUrl(memoryLocation.groupSlug, memory.slug),
      readingMinutes: readingMinutes(memory.markdownBody),
      kind: 'essay',
      cover: {
        src: memory.hero.src,
        alt: memory.hero.alt,
        width: 1024,
        height: 1536,
      },
    },
  ];
}

/** Three homepage picks: one free TIWIDFF story, Cold Boot, and a public essay. */
export async function getHomeReadingPicks(): Promise<readonly DiscoveryReadingItem[]> {
  const [posts, locations] = await Promise.all([getAllPosts(), buildPostUrlMap()]);
  const carl = COLLECTION.find((story) => story.slug === 'carl' && story.markdownBody);
  const coldBoot = getZooChapter('cold-boot');
  const essay = posts.find((post) => post.slug === 'rabies-capitalism');
  if (!carl?.markdownBody || !coldBoot || !essay?.hero) {
    throw new Error('A required homepage reading pick is missing.');
  }
  const location = locations.get(essay.slug);
  if (!location) throw new Error('The homepage essay pick is missing its public route.');

  return [
    {
      title: carl.title,
      description: carl.description,
      href: `${COLLECTION_PATH}/${carl.slug}`,
      readingMinutes: readingMinutes(carl.markdownBody),
      kind: 'fiction',
    },
    {
      title: coldBoot.title,
      description: coldBoot.description,
      href: coldBoot.path,
      readingMinutes: coldBoot.readingMinutes,
      kind: 'fiction',
    },
    {
      title: essay.title,
      description: essay.excerpt,
      href: buildPostUrl(location.groupSlug, essay.slug),
      readingMinutes: readingMinutes(essay.markdownBody),
      kind: 'essay',
    },
  ];
}
