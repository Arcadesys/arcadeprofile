import assert from 'node:assert/strict';
import test from 'node:test';

import storyJson from '@/data/toys/interspecies-dating-is-hard.json';
import {
  getInterspeciesDatingLocation,
  INTERSPECIES_DATING_LOCATIONS,
} from './interspecies-dating-locations';

test('defines 14 unique location images', () => {
  assert.equal(INTERSPECIES_DATING_LOCATIONS.length, 14);
  assert.equal(
    new Set(INTERSPECIES_DATING_LOCATIONS.map((location) => location.id)).size,
    14,
  );
});

test('uses public Vercel Blob URLs for every location image', () => {
  for (const location of INTERSPECIES_DATING_LOCATIONS) {
    assert.match(
      location.blobUrl,
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//,
    );
  }
});

test('maps representative Real and Toon passages to their locations', () => {
  assert.deepEqual(
    getInterspeciesDatingLocation('Quorum Park')?.world,
    'real',
  );
  assert.equal(
    getInterspeciesDatingLocation('Quorum Park')?.id,
    'quorum-park',
  );
  assert.deepEqual(getInterspeciesDatingLocation('JANM Date')?.world, 'toon');
  assert.equal(getInterspeciesDatingLocation('JANM Date')?.id, 'janm');
});

test('maps every passage to a location image', () => {
  for (const passage of storyJson.passages) {
    assert.ok(
      getInterspeciesDatingLocation(passage.id),
      `Missing location image for ${passage.id}`,
    );
  }
});
