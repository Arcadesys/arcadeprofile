import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';

export const dynamic = 'force-dynamic';

const title = 'Essays on AI, Creativity & Accessibility';
const description = 'Personal essays by Austen Tucker on trans and queer life, disability and accessibility, AI and creativity, and the craft of writing.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/essays' },
  openGraph: { type: 'website', title: `${title} | ${SITE_NAME}`, description, url: '/essays', images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images: [DEFAULT_SOCIAL_IMAGE.url] },
};

export default async function EssaysPage() {
  const catalog = await getEditorialCatalog();
  return <EditorialIndex section="essays" groups={catalog.essays} />;
}
