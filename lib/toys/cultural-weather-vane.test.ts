import assert from 'node:assert/strict';
import test from 'node:test';

import { news, songs, years, yearWeather } from '@/data/toys/cultural-weather-vane';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { LAB_PROJECTS } from '@/data/lab-projects';
import { buildToyMetadata } from './metadata';

const approvedDescription =
  'Put the year’s biggest songs and news stories on the same emotional map—and see where the atmosphere drifts.';

test('Cultural Weather Vane preserves the complete sampled corpus', () => {
  assert.equal(years.length, 12);
  assert.equal(songs.length, 72);
  assert.equal(news.length, 72);
  assert.equal(yearWeather.length, years.length);

  const ids = new Set([...songs, ...news].map(({ id }) => id));
  assert.equal(ids.size, 144);
  for (const year of years) {
    assert.equal(songs.filter((item) => item.year === year).length, 6);
    assert.equal(news.filter((item) => item.year === year).length, 6);
  }
  for (const item of [...songs, ...news]) {
    assert.ok(item.activation >= -1 && item.activation <= 1);
    assert.ok(item.valence >= -1 && item.valence <= 1);
    assert.ok(item.prominence >= 0 && item.prominence <= 1);
  }
});

test('Toy and Lab catalogs retain the approved publishing contract', () => {
  const toy = TOY_CATALOG.find(({ id }) => id === 'cultural-weather-vane');
  assert.ok(toy);
  assert.equal(toy.kind, 'Interactive data toy');
  assert.equal(toy.status, 'Explore now');
  assert.equal(toy.description, approvedDescription);
  assert.equal(toy.completionMode, 'linear');
  assert.equal(toy.outcomeCount, 1);
  assert.equal(toy.nextToyId, 'interspecies-dating-is-hard');
  assert.equal(toy.isNew, true);
  assert.equal(toy.image?.width, 1600);
  assert.equal(toy.image?.height, 1000);

  const lab = LAB_PROJECTS.find(({ slug }) => slug === 'cultural-weather-vane');
  assert.ok(lab);
  assert.equal(lab.status, 'Playable prototype · Data experiment');
  assert.equal(lab.sourceUrl, undefined);
  assert.deepEqual(lab.disciplines, [
    'Data visualization',
    'Cultural analysis',
    'AI-assisted prototyping',
    'Accessible UI',
  ]);
  assert.deepEqual(lab.screenshot, toy.image);
});

test('Toy metadata aligns canonical and social URLs', () => {
  const metadata = buildToyMetadata({
    title: 'Cultural Weather Vane',
    description: approvedDescription,
    path: '/toys/cultural-weather-vane',
  });
  assert.equal(metadata.alternates?.canonical, '/toys/cultural-weather-vane');
  assert.equal((metadata.openGraph as { url?: string }).url, '/toys/cultural-weather-vane');
});
