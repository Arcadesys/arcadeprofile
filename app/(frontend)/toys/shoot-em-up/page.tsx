import type { Metadata } from 'next';

import ShootEmUpGame from '@/app/components/toys/ShootEmUpGame';

export const metadata: Metadata = {
  title: "Shoot 'em Up",
  description:
    'A playable interactive-fiction argument between action-game violence and a perfectly good pot of tea. By Austen Crowder.',
  alternates: {
    canonical: '/toys/shoot-em-up',
  },
};

export default function ShootEmUpPage() {
  return <ShootEmUpGame />;
}
