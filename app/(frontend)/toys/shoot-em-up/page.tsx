import type { Metadata } from 'next';

import ShootEmUpGame from '@/app/components/toys/ShootEmUpGame';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';

const toy = TOY_CATALOG.find(({ id }) => id === 'shoot-em-up');

export const metadata: Metadata = buildToyMetadata({
  title: "Shoot 'em Up",
  description:
    'A playable interactive-fiction argument between action-game violence and a perfectly good pot of tea. By Austen Crowder.',
  path: '/toys/shoot-em-up',
  image: toy?.image,
});

export default function ShootEmUpPage() {
  return <ShootEmUpGame />;
}
