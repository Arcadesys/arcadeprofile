import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';

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
  return (
    <EditorialIndex
      section="fiction"
      groups={catalog.fiction}
      collection={catalog.collection}
      collectionPath={catalog.collectionPath}
      portfolio={PORTFOLIO_WORKS}
    />
  );
}
