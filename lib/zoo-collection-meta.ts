import assets from '@/data/zoo-collection-assets.json';

export const ZOO_COLLECTION_TITLE = 'It Takes a Zoo';
export const ZOO_COLLECTION_PATH = '/novels/it-takes-a-zoo';
export const ZOO_COLLECTION_DESCRIPTION = 'A novel-in-stories about escaping the hypercapitalist grind.';
export const ZOO_HERO_ALT = 'A sheltered open-air virtual bar overlooks a rainy neon city. A low-poly fox and painterly mouse, rabbit, cat, and human share drinks beneath the roof.';

export const ZOO_HERO = {
  ...assets.hero,
  alt: ZOO_HERO_ALT,
};

export type FeaturedCollectionMetadata = {
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  firstChapterPath: string;
  chapterCount: number;
  availability: string;
  incentiveAction?: { href: string; label: string };
  cover: typeof ZOO_HERO;
  purchaseAction?: { href: string };
};

export const ZOO_FEATURED_COLLECTION: FeaturedCollectionMetadata = {
  eyebrow: 'Featured novel-in-stories',
  title: ZOO_COLLECTION_TITLE,
  description: ZOO_COLLECTION_DESCRIPTION,
  path: ZOO_COLLECTION_PATH,
  firstChapterPath: `${ZOO_COLLECTION_PATH}/cold-boot`,
  chapterCount: 6,
  availability: 'Read online · PDFs available by chapter or as one complete edition',
  incentiveAction: { href: `${ZOO_COLLECTION_PATH}#complete-pdf`, label: 'Get the complete PDF' },
  cover: ZOO_HERO,
};
