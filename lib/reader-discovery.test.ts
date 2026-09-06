import assert from 'node:assert/strict';
import test from 'node:test';

import { getStartReadingShelf } from './reader-discovery';

test('the starting shelf keeps the approved reading order and canonical paths', async () => {
  const shelf = await getStartReadingShelf();

  assert.deepEqual(shelf.map((item) => item.title), [
    'Carl',
    'Cold Boot',
    'Rabies Capitalism',
    "I Thought I Had a Bad Memory. I Don't.",
  ]);
  assert.deepEqual(shelf.map((item) => item.href), [
    '/this-is-what-i-do-for-fun/carl',
    '/novels/it-takes-a-zoo/cold-boot',
    '/projects/the-singularity-log/rabies-capitalism',
    '/projects/white-cane-chronicles/gist-memory-is-not-a-bug',
  ]);
  assert.deepEqual(shelf.map((item) => item.description), [
    'An aging Floor-Mart android is told it is time to turn himself in, but he has only ever known how to keep working.',
    'Jamie discovers the Zoo, a private full-dive server where nobody asks her to prove she belongs before setting another place at the table.',
    'On AI, Labor, and the End of the Moat',
    "Sighted people use the world around them to help them remember thing. When you can't do that, your brain builds something different. Something that might actually be better in some cases.",
  ]);
  assert.deepEqual(shelf.map((item) => item.readingMinutes), [38, 31, 7, 8]);
  assert.deepEqual(shelf.map((item) => item.cover?.alt), [
    'Black ink emblem of an android face and cart wheel on cloth-white paper.',
    'A sheltered open-air virtual bar overlooks a rainy neon city. A low-poly fox and painterly mouse, rabbit, cat, and human share drinks beneath the roof.',
    'Cover of Rabies Capitalism by Austen Tucker: a snarling bull stands on crumbling foundations in a black, ivory, and rust woodcut illustration.',
    "Cover of I Thought I Had a Bad Memory. I Don't. by Austen Tucker: scattered fragments join a continuous ivory ribbon, forming an ordered path against a navy background.",
  ]);
});
