import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';

import EditorialIndex from '@/app/components/EditorialIndex';
import type { FeaturedCollection } from '@/app/components/FeaturedCollectionCard';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { COLLECTION, COLLECTION_PATH, COLLECTION_TITLE } from '@/lib/collection';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';
import { ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

export const dynamic = 'force-dynamic';

const description = `Read fiction by Austen Tucker: serial stories, short fiction, and free downloadable editions from ${SITE_NAME}.`;
const collectionCover = COLLECTION[0]!;

const FEATURED_COLLECTIONS: readonly FeaturedCollection[] = [
  {
    id: 'this-is-what-i-do-for-fun',
    eyebrow: 'Featured short-story collection',
    title: COLLECTION_TITLE,
    description: 'Seven stories about labor, transformation, grief, queer survival, and the strange lives we build together.',
    details: 'Seven stories · Read online · PDF editions available',
    cover: {
      src: collectionCover.cover.src,
      alt: collectionCover.coverAlt,
      width: collectionCover.cover.width,
      height: collectionCover.cover.height,
    },
    primaryAction: { href: COLLECTION_PATH, label: 'Explore the collection' },
    secondaryAction: { href: `${COLLECTION_PATH}/${collectionCover.slug}`, label: `Begin with ${collectionCover.title}` },
  },
];

export const metadata: Metadata = {
  title: 'Stories',
  description,
  alternates: { canonical: '/stories' },
  openGraph: { type: 'website', title: `Stories | ${SITE_NAME}`, description, url: '/stories', images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: `Stories | ${SITE_NAME}`, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
};

export default async function StoriesPage() {
  const catalog = await getEditorialCatalog();
  return (
    <EditorialIndex
      section="fiction"
      featuredCollection={ZOO_FEATURED_COLLECTION}
      featuredCollections={FEATURED_COLLECTIONS}
      groups={catalog.fiction}
      collection={catalog.collection}
      collectionPath={catalog.collectionPath}
      portfolio={PORTFOLIO_WORKS}
    />
  );
}
