import type { Metadata } from 'next';
import Link from 'next/link';

import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';
import CulturalWeatherVaneLoader from './CulturalWeatherVaneLoader';

const toy = TOY_CATALOG.find(({ id }) => id === 'cultural-weather-vane');

export const metadata: Metadata = buildToyMetadata({
  title: 'Cultural Weather Vane',
  description:
    'A visual field for feeling the atmosphere of music and news across the years, without pretending an editorial reading is a measurement.',
  path: '/toys/cultural-weather-vane',
  image: toy?.image,
});

export default function CulturalWeatherVanePage() {
  return (
    <>
      <CulturalWeatherVaneLoader />
      <p style={{ margin: '1rem auto', maxWidth: '64rem', padding: '0 1rem' }}>
        <Link href="/lab/cultural-weather-vane">Want to know why I built this?</Link>
      </p>
    </>
  );
}
