import type { Metadata } from 'next';

import InterspeciesDatingGame from '@/app/components/toys/InterspeciesDatingGame';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';

const toy = TOY_CATALOG.find(({ id }) => id === 'interspecies-dating-is-hard');

export const metadata: Metadata = buildToyMetadata({
  title: 'Interspecies Dating is Hard',
  description:
    'A playable interactive-fiction date-planning story by Austen Tucker.',
  path: '/toys/interspecies-dating-is-hard',
  image: toy?.image,
});

export default function InterspeciesDatingPage() {
  return <InterspeciesDatingGame />;
}
