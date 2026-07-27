import type { Metadata } from 'next';

import SplitInTwoGame from '@/app/components/toys/SplitInTwoGame';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';

const toy = TOY_CATALOG.find(({ id }) => id === 'the-day-i-split-in-two');

export const metadata: Metadata = buildToyMetadata({
  title: 'The Day I Split in Two',
  description:
    'A playable autobiographical interactive-fiction story about transition, Tally, family, and rebuilding. By Austen Crowder.',
  path: '/toys/the-day-i-split-in-two',
  image: toy?.image,
});

export default function SplitInTwoPage() {
  return <SplitInTwoGame />;
}
