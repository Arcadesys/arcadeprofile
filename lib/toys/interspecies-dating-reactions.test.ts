import assert from 'node:assert/strict';
import test from 'node:test';

import storyJson from '@/data/toys/interspecies-dating-is-hard.json';
import {
  GERTRUDE_REACTIONS,
  getGertrudeReaction,
} from './interspecies-dating-reactions';

test('defines six unique Gertrude reactions', () => {
  assert.equal(GERTRUDE_REACTIONS.length, 6);
  assert.equal(
    new Set(GERTRUDE_REACTIONS.map((reaction) => reaction.id)).size,
    6,
  );
});

test('uses public Vercel Blob URLs for every Gertrude reaction', () => {
  for (const reaction of GERTRUDE_REACTIONS) {
    assert.match(
      reaction.blobUrl,
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//,
    );
  }
});

test('assigns a reaction to every passage', () => {
  for (const passage of storyJson.passages) {
    assert.ok(getGertrudeReaction(passage.id, {}));
  }
});

test('uses story state for conditional date reactions', () => {
  assert.equal(
    getGertrudeReaction('JANM Date', { Painted: true }).id,
    'tender',
  );
  assert.equal(getGertrudeReaction('JANM Date', { Painted: false }).id, 'worried');
  assert.equal(
    getGertrudeReaction('Chez Date', { CoolWithAMakeover: true }).id,
    'delighted',
  );
  assert.equal(
    getGertrudeReaction('Chez Date', { CoolWithAMakeover: false }).id,
    'worried',
  );
});
