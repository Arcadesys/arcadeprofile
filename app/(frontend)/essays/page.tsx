import type { Metadata } from 'next';

import EditorialIndex from '@/app/components/EditorialIndex';
import { getEditorialCatalog } from '@/lib/editorial-catalog';
import { editorialHubMetadata, ESSAYS_HUB } from '@/lib/editorial-hub-metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = editorialHubMetadata(ESSAYS_HUB);

export default async function EssaysPage() {
  const catalog = await getEditorialCatalog();
  return <EditorialIndex section="essays" groups={catalog.essays} />;
}
