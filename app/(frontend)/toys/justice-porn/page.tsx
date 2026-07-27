import type { Metadata } from 'next';

import JusticePornGame from '@/app/components/toys/JusticePornGame';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';

const toy = TOY_CATALOG.find(({ id }) => id === 'justice-porn');

export const metadata: Metadata = buildToyMetadata({
  title: 'Justice Porn',
  description:
    'A playable interactive-fiction story about punishment, spectatorship, and what happens when law replaces justice. By Austen Crowder.',
  path: '/toys/justice-porn',
  image: toy?.image,
});

export default function JusticePornPage() {
  return <JusticePornGame />;
}
