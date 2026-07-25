import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_TOY_PASSPORT,
  latestInProgressToy,
  parseToyPassport,
} from './toy-passport';

const progress = {
  currentPassageId: 'Tea Time',
  entryVariables: { Inventory: 'Tea Service' },
  visitedPassageIds: ['Start', 'The Dude', 'Tea Time'],
  endingIds: ['Tea Time'],
  atEnding: true,
  updatedAt: '2026-07-25T12:00:00.000Z',
};

test('returns an empty passport for missing or malformed storage', () => {
  assert.deepEqual(parseToyPassport(null), EMPTY_TOY_PASSPORT);
  assert.deepEqual(parseToyPassport('{nope'), EMPTY_TOY_PASSPORT);
  assert.deepEqual(parseToyPassport('{"version":2,"games":{}}'), EMPTY_TOY_PASSPORT);
});

test('keeps valid games and drops malformed progress entries', () => {
  const passport = parseToyPassport(
    JSON.stringify({
      version: 1,
      games: {
        'shoot-em-up': progress,
        broken: { currentPassageId: 42 },
      },
    }),
  );

  assert.deepEqual(passport.games, { 'shoot-em-up': progress });
});

test('selects the most recently updated unfinished toy', () => {
  const passport = parseToyPassport(
    JSON.stringify({
      version: 1,
      games: {
        completed: progress,
        older: {
          ...progress,
          currentPassageId: 'Older',
          endingIds: [],
          atEnding: false,
          updatedAt: '2026-07-25T10:00:00.000Z',
        },
        unopened: {
          ...progress,
          currentPassageId: 'Start',
          visitedPassageIds: ['Start'],
          endingIds: [],
          atEnding: false,
          updatedAt: '2026-07-25T12:30:00.000Z',
        },
        newer: {
          ...progress,
          currentPassageId: 'Newer',
          endingIds: [],
          atEnding: false,
          updatedAt: '2026-07-25T11:00:00.000Z',
        },
      },
    }),
  );

  assert.equal(latestInProgressToy(passport)?.[0], 'newer');
});
