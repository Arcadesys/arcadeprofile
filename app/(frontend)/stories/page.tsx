import type { Metadata } from 'next';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';

export const dynamic = 'force-dynamic';

const description = 'Read fiction by Austen Tucker: serial stories, short fiction, and free downloadable editions from Free Play Publishing.';

export const metadata: Metadata = {
  title: 'Stories',
  description,
  alternates: { canonical: '/stories' },
  openGraph: { type: 'website', title: 'Stories | Free Play Publishing', description, url: '/stories' },
  twitter: { card: 'summary_large_image', title: 'Stories | Free Play Publishing', description },
};

export default async function StoriesPage() {
  const catalog = await getEditorialCatalog();
  return <EditorialIndex section="fiction" groups={catalog.fiction} collection={catalog.collection} collectionPath={catalog.collectionPath} />;
}
