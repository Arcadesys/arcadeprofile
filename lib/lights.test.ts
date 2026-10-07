import assert from 'node:assert/strict';
import test from 'node:test';

import { getDefaultLightMode, isLightMode, LIGHTS_STORAGE_KEY } from './lights';

test('discovery and interactive routes default to lights on', () => {
  for (const path of ['/', '/stories', '/essays', '/latest', '/lab', '/projects', '/portfolio', '/toys/demo', '/books', '/subscribe']) {
    assert.equal(getDefaultLightMode(path), 'on', path);
  }
});

test('long-form routes default to lights off', () => {
  for (const path of ['/bio', '/resume', '/bibliography', '/preview/token', '/blog/post', '/lab/wizwor', '/portfolio/sample', '/this-is-what-i-do-for-fun/carl', '/projects/serial/chapter']) {
    assert.equal(getDefaultLightMode(path), 'off', path);
  }
});

test('light mode validation accepts only persisted modes', () => {
  assert.equal(LIGHTS_STORAGE_KEY, 'arcades-lights');
  assert.equal(isLightMode('on'), true);
  assert.equal(isLightMode('off'), true);
  assert.equal(isLightMode('adaptive'), false);
  assert.equal(isLightMode(null), false);
});
