import type { Metadata } from 'next';

import InterspeciesDatingGame from '@/app/components/toys/InterspeciesDatingGame';

export const metadata: Metadata = {
  title: 'Interspecies Dating is Hard',
  description:
    'A playable interactive-fiction date-planning story by Austen Tucker.',
  alternates: {
    canonical: '/toys/interspecies-dating-is-hard',
  },
};

export default function InterspeciesDatingPage() {
  return <InterspeciesDatingGame />;
}
