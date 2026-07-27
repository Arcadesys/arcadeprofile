import type { Metadata } from 'next';

import ButterflyGame from '@/app/components/toys/ButterflyGame';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';

const toy = TOY_CATALOG.find(({ id }) => id === 'butterfly-exe');

export const metadata: Metadata = buildToyMetadata({
  title: 'Butterfly.exe',
  description:
    'A playable interactive-fiction story about uploading, grief, and what a copy of someone is worth. By Austen Crowder.',
  path: '/toys/butterfly-exe',
  image: toy?.image,
});

export default function ButterflyPage() {
  return <ButterflyGame />;
}
