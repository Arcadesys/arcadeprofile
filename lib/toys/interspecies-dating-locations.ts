import locationImagesJson from '@/data/toys/interspecies-dating-is-hard-images.json';

export type InterspeciesDatingLocation = {
  id: string;
  title: string;
  world: 'real' | 'toon';
  blobUrl: string;
  alt: string;
  passages: string[];
};

export const INTERSPECIES_DATING_LOCATIONS =
  locationImagesJson.locations as InterspeciesDatingLocation[];

const locationByPassage = new Map<string, InterspeciesDatingLocation>();

for (const location of INTERSPECIES_DATING_LOCATIONS) {
  for (const passage of location.passages) {
    locationByPassage.set(passage, location);
  }
}

export function getInterspeciesDatingLocation(
  passageId: string,
): InterspeciesDatingLocation | null {
  return locationByPassage.get(passageId) ?? null;
}
