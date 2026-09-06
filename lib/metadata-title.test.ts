import assert from 'node:assert/strict';
import test from 'node:test';

import { stripGeneratedTitleSuffix } from './metadata-title';

const SERIES = 'The Singularity Log';
const SITE = "The Arcades' Lab";

test('removes only a trailing generated series or site suffix', () => {
  assert.equal(stripGeneratedTitleSuffix(`Claude Design and the Novel T — ${SERIES}`, SERIES, SITE), 'Claude Design and the Novel T');
  assert.equal(stripGeneratedTitleSuffix(`The Bad Place | ${SERIES}`, SERIES, SITE), 'The Bad Place');
  assert.equal(stripGeneratedTitleSuffix(`The Bad Place | ${SERIES} | ${SITE}`, SERIES, SITE), 'The Bad Place');
});

test('leaves authored title text alone when it does not end in an exact generated suffix', () => {
  assert.equal(stripGeneratedTitleSuffix('The Singularity Log Is a Place', SERIES, SITE), 'The Singularity Log Is a Place');
});
