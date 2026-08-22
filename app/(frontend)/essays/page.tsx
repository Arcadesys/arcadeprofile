import type { Metadata } from 'next';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';

export const dynamic = 'force-dynamic';

const description = 'Essays by Austen Tucker on creativity, writing, accessibility, AI, and the work of being human.';

export const metadata: Metadata = {
  title: 'Essays',
  description,
  alternates: { canonical: '/essays' },
  openGraph: { type: 'website', title: 'Essays | Free Play Publishing', description, url: '/essays' },
  twitter: { card: 'summary_large_image', title: 'Essays | Free Play Publishing', description },
};

export default async function EssaysPage() {
  const catalog = await getEditorialCatalog();
  return <EditorialIndex section="essays" groups={catalog.essays} />;
}
