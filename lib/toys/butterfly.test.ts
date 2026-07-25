import assert from 'node:assert/strict';
import test from 'node:test';

import storyJson from '@/data/toys/butterfly-exe.json';
import { BUTTERFLY_ENDINGS } from '@/lib/toys/butterfly-endings';
import { enterPassage, type RawTwineStory } from '@/lib/toys/twine-engine';

const story = storyJson as RawTwineStory;

/** Walk the whole story graph from the start passage. */
function walk() {
  const visited = new Set<string>();
  const endings = new Set<string>();
  const queue = [story.start];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const { passage } = enterPassage(story, id, {});
    if (passage.choices.length === 0) {
      endings.add(id);
      continue;
    }

    for (const choice of passage.choices) {
      queue.push(choice.target);
    }
  }

  return { visited, endings };
}

test('every choice points at a passage that exists', () => {
  const ids = new Set(story.passages.map(({ id }) => id));
  assert.ok(ids.has(story.start), 'missing start passage');

  for (const passage of story.passages) {
    const { passage: prepared } = enterPassage(story, passage.id, {});
    for (const choice of prepared.choices) {
      assert.ok(
        ids.has(choice.target),
        `${passage.id} links to unknown passage: ${choice.target}`,
      );
    }
  }
});

test('no passage is unreachable from the start', () => {
  const { visited } = walk();
  const orphans = story.passages
    .map(({ id }) => id)
    .filter((id) => !visited.has(id));

  assert.deepEqual(orphans, [], `unreachable passages: ${orphans.join(', ')}`);
});

test('the author outline is not shipped as story text', () => {
  assert.equal(
    story.passages.some(({ id }) => id === 'OUTLINE'),
    false,
  );
});

test('the reachable dead ends are exactly the catalogued endings', () => {
  const { endings } = walk();
  assert.deepEqual(
    [...endings].sort(),
    BUTTERFLY_ENDINGS.map(({ id }) => id).sort(),
  );
});

test('the poem keeps its line breaks', () => {
  const { passage } = enterPassage(story, 'Poem', {});
  const lines = passage.body.split('\n');

  assert.ok(lines.length > 20, 'poem collapsed into prose');
  assert.ok(lines.includes('I want to remember'));
  // Twine 1 escapes indent spaces as \s; the importer restores them.
  assert.ok(lines.includes('----- down'));
  assert.ok(lines.includes('------ stream'));
});

test('choice labels read as finished sentences', () => {
  for (const passage of story.passages) {
    const { passage: prepared } = enterPassage(story, passage.id, {});
    for (const choice of prepared.choices) {
      const quotes = (choice.label.match(/"/g) ?? []).length;
      assert.equal(
        quotes % 2,
        0,
        `unbalanced quotes in ${passage.id} choice: ${choice.label}`,
      );
    }
  }
});
