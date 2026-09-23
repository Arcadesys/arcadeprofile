import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSiteAnalyticsContext, shouldTrackSiteAnalytics } from './site-analytics';

test('verification fragment URLs never produce analytics context', () => {
  const secretUrl = 'https://www.thearcades.me/subscribe/verify#signed-bearer-token';
  assert.equal(shouldTrackSiteAnalytics('/subscribe/verify'), false);
  assert.equal(buildSiteAnalyticsContext('/subscribe/verify', secretUrl), null);
  assert.deepEqual(buildSiteAnalyticsContext('/essays/example', 'https://www.thearcades.me/essays/example'), {
    pathname: '/essays/example',
    $current_url: 'https://www.thearcades.me/essays/example',
  });
});
