import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('each proven historical Soft Reset section redirects to its consolidated chapter', () => {
  const config = fs.readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8');
  for (const segment of [
    'soft-reset-1-ninety-seconds',
    'soft-reset-2-the-belt',
    'soft-reset-3-exactly-enough',
    'soft-reset-4-third-stone-past-the-mailbox',
    'soft-reset-5-the-same-wall-two-different-dates',
    'soft-reset-6-then-what',
  ]) assert.match(config, new RegExp(`'${segment}'`));
  assert.match(config, /destination: '\/novels\/it-takes-a-zoo\/soft-reset'/);
});
