import assert from 'node:assert/strict';
import test from 'node:test';

import justiceJson from '@/data/toys/justice-porn.json';
import shootJson from '@/data/toys/shoot-em-up.json';
import splitJson from '@/data/toys/the-day-i-split-in-two.json';
import { enterPassage, type RawTwineStory } from './twine-engine';

const stories = [
  justiceJson as RawTwineStory,
  shootJson as RawTwineStory,
  splitJson as RawTwineStory,
];

for (const story of stories) {
  test(`${story.title}: every authored link points at a real passage`, () => {
    const ids = new Set(story.passages.map(({ id }) => id));
    const broken: string[] = [];

    for (const passage of story.passages) {
      for (const match of passage.text.matchAll(
        /\[\[([^\]|]*?)(?:\|([^\]]+))?\]\]/g,
      )) {
        const target = (match[2] ?? match[1]).trim();
        if (!ids.has(target)) broken.push(`${passage.id} -> ${target}`);
      }
    }

    assert.deepEqual(broken, []);
  });

  test(`${story.title}: every passage can be prepared`, () => {
    for (const passage of story.passages) {
      assert.doesNotThrow(() => enterPassage(story, passage.id, {}));
    }
  });
}

test("Shoot 'em Up expands its inventory and removes legacy image markup", () => {
  const story = shootJson as RawTwineStory;
  const dude = enterPassage(story, 'The Dude', {});
  const puppy = enterPassage(story, '05', {});

  assert.match(dude.passage.body, /Inventory:/);
  assert.match(dude.passage.body, /Desert Eagle/);
  assert.doesNotMatch(puppy.passage.body, /<img/i);
  assert.doesNotMatch(puppy.passage.body, /dropbox/i);
});

test('the three imported stories end where the originals end', () => {
  const expected = new Map<string, string[]>([
    ['Justice Porn', ['putting bullets in faces']],
    ["Shoot 'em Up", ['Dead Tea Time', 'Tea Time']],
    ['The Day I Split in Two', ['enough for me']],
  ]);

  for (const story of stories) {
    const endings = story.passages
      .map(({ id }) => enterPassage(story, id, {}))
      .filter(({ passage }) => passage.choices.length === 0)
      .map(({ passage }) => passage.id)
      .filter((id) => id !== 'Inventory')
      .sort();

    assert.deepEqual(endings, expected.get(story.title));
  }
});
