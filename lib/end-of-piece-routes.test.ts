import assert from 'node:assert/strict';
import test from 'node:test';

import { hasEndOfPieceSignup } from './end-of-piece-routes';

test('long-form reader pages carry the end-of-piece signup', () => {
  assert.equal(hasEndOfPieceSignup('/projects/the-singularity-log/rabies-capitalism'), true);
  assert.equal(hasEndOfPieceSignup('/novels/it-takes-a-zoo/cold-boot'), true);
  assert.equal(hasEndOfPieceSignup('/this-is-what-i-do-for-fun/carl'), true);
  assert.equal(hasEndOfPieceSignup('/portfolio/gallery-view'), true);
  assert.equal(hasEndOfPieceSignup('/lab/conductor'), true);
});

test('index pages and Queer Columns keep their own signup placement', () => {
  assert.equal(hasEndOfPieceSignup('/'), false);
  assert.equal(hasEndOfPieceSignup('/projects'), false);
  assert.equal(hasEndOfPieceSignup('/projects/the-singularity-log'), false);
  assert.equal(hasEndOfPieceSignup('/projects/queer-columns/the-safe-door'), false);
  assert.equal(hasEndOfPieceSignup('/novels/it-takes-a-zoo'), false);
  assert.equal(hasEndOfPieceSignup('/portfolio'), false);
  assert.equal(hasEndOfPieceSignup('/lab'), false);
});
