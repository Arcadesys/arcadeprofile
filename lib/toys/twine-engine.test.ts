import assert from 'node:assert/strict';
import test from 'node:test';

import storyJson from '@/data/toys/interspecies-dating-is-hard.json';
import {
  enterPassage,
  type RawTwineStory,
  type TwineVariables,
} from './twine-engine';

const story = storyJson as RawTwineStory;

test('initializes the original date budget and opening choices', () => {
  const entered = enterPassage(story, story.start, {});

  assert.equal(entered.variables.Dollars, 75);
  assert.deepEqual(
    entered.passage.choices.map(({ label }) => label),
    ['Get to planning!', "Wait a minute, I'm a raccoon?"],
  );
});

test('applies ticket purchases when their passage is entered', () => {
  const entered = enterPassage(story, 'Buy JANM Tix', { Dollars: 75 });

  assert.equal(entered.variables.Dollars, 45);
  assert.equal(entered.variables.JANMDate, true);
});

test('hides choices the player cannot afford', () => {
  const entered = enterPassage(story, 'Misteak Menu', { Dollars: 45 });

  assert.deepEqual(
    entered.passage.choices.map(({ label }) => label),
    ['Too rich for my blood!'],
  );
});

test('keeps prose that shares a line with an authored choice', () => {
  const entered = enterPassage(story, 'List', { Dollars: 75 });

  assert.match(
    entered.passage.body,
    /Go back to your place if you're ready to call Tess\./,
  );
  assert.doesNotMatch(entered.passage.body, /^Marie's Thrift Shop$/m);
});

test('reveals the makeover route after the library meeting', () => {
  const variables: TwineVariables = {
    Dollars: 35,
    CoolWithAMakeover: true,
    ChezDate: true,
  };
  const entered = enterPassage(story, 'Where to?', variables);

  assert.equal(
    entered.passage.choices[0]?.label,
    'I was thinking we could go for a makeover together!',
  );
  assert.match(entered.passage.body, /hand slides into yours/);
});

test('repairs the original Makeover/Painted variable typo', () => {
  const entered = enterPassage(story, 'Lakeside Date', {
    Painted: true,
  });

  assert.match(entered.passage.body, /Nice paint/);
});

test('keeps every authored internal link pointed at a real passage', () => {
  const passageIds = new Set(story.passages.map(({ id }) => id));
  const broken: string[] = [];

  for (const passage of story.passages) {
    for (const match of passage.text.matchAll(/\[\[([^\]|]*?)(?:\|([^\]]+))?\]\]/g)) {
      const target = (match[2] ?? match[1]).trim();
      if (!passageIds.has(target)) broken.push(`${passage.id} -> ${target}`);
    }
  }

  assert.deepEqual(broken, []);
});
