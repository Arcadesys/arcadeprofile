import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';

import EditorialIndex from '@/app/components/EditorialIndex';
import type { FeaturedCollection } from '@/app/components/FeaturedCollectionCard';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE } from '@/lib/collection';
import { ZOO_CHAPTERS, ZOO_COLLECTION_DESCRIPTION, ZOO_COLLECTION_PATH, ZOO_COLLECTION_TITLE, ZOO_HERO } from '@/lib/zoo-collection';

const HIDDEN_STORY_GROUPS = new Set(['it-takes-a-zoo', 'parts-of-the-whole', 'short-stories']);
const collectionCover = COLLECTION[0]!;

const FEATURED_COLLECTIONS: readonly FeaturedCollection[] = [
  {
    id: 'this-is-what-i-do-for-fun',
    eyebrow: 'Featured short-story collection',
    title: COLLECTION_TITLE,
    description: 'Seven stories about labor, transformation, grief, queer survival, and the strange lives we build together.',
    details: 'Seven stories · Read online · PDF editions available',
    cover: { src: collectionCover.cover.src, alt: collectionCover.coverAlt, width: collectionCover.cover.width, height: collectionCover.cover.height },
    primaryAction: { href: COLLECTION_PATH, label: 'Explore the collection' },
    secondaryAction: { href: `${COLLECTION_PATH}/${collectionCover.slug}`, label: `Begin with ${collectionCover.title}` },
  },
  {
    id: 'it-takes-a-zoo',
    eyebrow: 'Featured novel-in-stories',
    title: ZOO_COLLECTION_TITLE,
    description: ZOO_COLLECTION_DESCRIPTION,
    details: 'Six chapters · Read online · PDFs available by chapter',
    cover: { src: ZOO_HERO.url, alt: ZOO_HERO.alt, width: ZOO_HERO.width, height: ZOO_HERO.height },
    primaryAction: { href: ZOO_COLLECTION_PATH, label: 'Explore the collection' },
    secondaryAction: { href: ZOO_CHAPTERS[0]!.path, label: `Begin with ${ZOO_CHAPTERS[0]!.title}` },
  },
];

export const dynamic = 'force-dynamic';

const description = `Read fiction by Austen Tucker: serial stories, short fiction, and free downloadable editions from ${SITE_NAME}.`;

export const metadata: Metadata = {
  title: 'Stories',
  description,
  alternates: { canonical: '/stories' },
  openGraph: { type: 'website', title: `Stories | ${SITE_NAME}`, description, url: '/stories' },
  twitter: { card: 'summary_large_image', title: `Stories | ${SITE_NAME}`, description },
};

export default async function StoriesPage() {
  const catalog = await getEditorialCatalog();
  const groups = catalog.fiction.filter((group) => !HIDDEN_STORY_GROUPS.has(group.slug));

  return <EditorialIndex section="fiction" groups={groups} featuredCollections={FEATURED_COLLECTIONS} />;
}
