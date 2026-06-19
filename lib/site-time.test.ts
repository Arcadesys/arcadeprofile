import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SITE_TZ,
  SITE_TZ,
  formatSiteDate,
  formatSiteDateTime,
  resolveSiteTimeZone,
} from './site-time';

test('resolveSiteTimeZone falls back to the site default for missing or invalid values', () => {
  assert.equal(resolveSiteTimeZone(undefined), DEFAULT_SITE_TZ);
  assert.equal(resolveSiteTimeZone('Not/A_Timezone'), DEFAULT_SITE_TZ);
  assert.equal(resolveSiteTimeZone('America/New_York'), 'America/New_York');
});

test('formatSiteDate formats dates in the configured site timezone', () => {
  const input = '2026-05-14T04:30:00.000Z';
  const expected = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(input));

  assert.equal(formatSiteDate(input), expected);
});

test('formatSiteDateTime formats scheduled timestamps in the configured site timezone', () => {
  const input = '2026-05-14T04:30:00.000Z';
  const expected = new Date(input).toLocaleString('en-US', {
    timeZone: SITE_TZ,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  assert.equal(formatSiteDateTime(input), expected);
});
