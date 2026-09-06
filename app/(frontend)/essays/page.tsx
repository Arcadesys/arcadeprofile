import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

export const dynamic = 'force-dynamic';

const description = 'Essays by Austen Tucker on creativity, writing, accessibility, AI, and the work of being human.';

export const metadata: Metadata = {
  title: 'Essays',
  description,
  alternates: { canonical: '/essays' },
  openGraph: { type: 'website', title: `Essays | ${SITE_NAME}`, description, url: '/essays', images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: `Essays | ${SITE_NAME}`, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
};

export default async function EssaysPage() {
  const catalog = await getEditorialCatalog();
  return <EditorialIndex section="essays" groups={catalog.essays} />;
}
