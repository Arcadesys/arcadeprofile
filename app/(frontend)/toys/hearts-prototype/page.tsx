import type { Metadata } from 'next';

import HeartsPrototype from '@/app/components/toys/HeartsPrototype';
import { buildToyMetadata } from '@/lib/toys/metadata';

export const metadata: Metadata = buildToyMetadata({
  title: 'Hearts: Wall One',
  description:
    'A playable Hearts rules prototype where every player assigns four rank blocks to the four suits.',
  path: '/toys/hearts-prototype',
});

export default function HeartsPrototypePage() {
  return <HeartsPrototype />;
}
