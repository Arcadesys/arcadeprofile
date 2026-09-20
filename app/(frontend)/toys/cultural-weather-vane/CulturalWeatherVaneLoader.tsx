'use client';

import dynamic from 'next/dynamic';

const CulturalWeatherVaneToy = dynamic(
  () => import('@/app/components/toys/CulturalWeatherVaneToy'),
  { ssr: false },
);

export default function CulturalWeatherVaneLoader() {
  return <CulturalWeatherVaneToy />;
}
