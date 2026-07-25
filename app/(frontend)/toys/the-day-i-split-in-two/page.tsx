import type { Metadata } from 'next';

import SplitInTwoGame from '@/app/components/toys/SplitInTwoGame';

export const metadata: Metadata = {
  title: 'The Day I Split in Two',
  description:
    'A playable autobiographical interactive-fiction story about transition, Tally, family, and rebuilding. By Austen Crowder.',
  alternates: {
    canonical: '/toys/the-day-i-split-in-two',
  },
};

export default function SplitInTwoPage() {
  return <SplitInTwoGame />;
}
