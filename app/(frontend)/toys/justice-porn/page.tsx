import type { Metadata } from 'next';

import JusticePornGame from '@/app/components/toys/JusticePornGame';

export const metadata: Metadata = {
  title: 'Justice Porn',
  description:
    'A playable interactive-fiction story about punishment, spectatorship, and what happens when law replaces justice. By Austen Crowder.',
  alternates: {
    canonical: '/toys/justice-porn',
  },
};

export default function JusticePornPage() {
  return <JusticePornGame />;
}
