import type { Metadata } from 'next';

import ButterflyGame from '@/app/components/toys/ButterflyGame';

export const metadata: Metadata = {
  title: 'Butterfly.exe',
  description:
    'A playable interactive-fiction story about uploading, grief, and what a copy of someone is worth. By Austen Crowder.',
  alternates: {
    canonical: '/toys/butterfly-exe',
  },
};

export default function ButterflyPage() {
  return <ButterflyGame />;
}
