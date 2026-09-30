import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSiteAnalyticsContext, shouldTrackSiteAnalytics, canCaptureBrowserAnalytics, sanitizeVercelAnalyticsEvent } from './site-analytics';
import { analyticsBrowser } from './fixtures/analytics-browser';

const origin = 'https://www.thearcades.me';

test('only exact public paths produce analytics context, never bearer/unknown routes', () => {
  for (const path of ['/subscribe/verify', '/subscribe/verify/', '/subscribe/unsubscribe', '/subscribe/thanks', '/api/subscribe', '/drafts/secret', '/stories/private', '/projects/unknown/future', '/%73tories', '//stories', '/stories//']) {
    assert.equal(shouldTrackSiteAnalytics(path), false, path);
    assert.equal(buildSiteAnalyticsContext(path, `${origin}${path}#token`), null, path);
  }
  for (const path of ['/', '/stories', '/mff', '/start', '/subscribe', '/portfolio/gallery-view', '/novels/it-takes-a-zoo/cold-boot', '/toys/interspecies-dating-is-hard', '/projects/the-singularity-log/rabies-capitalism']) assert.equal(shouldTrackSiteAnalytics(path), true, path);
  assert.deepEqual(buildSiteAnalyticsContext('/stories/', `${origin}/stories/?email=private%40example.com#private-token`), {
    pathname: '/stories', $pathname: '/stories', $host: 'www.thearcades.me', $current_url: `${origin}/stories`,
  });
});

test('production host and deployment gates fail closed without needing optional public env', (t) => {
  const dom = analyticsBrowser(t);
  assert.equal(canCaptureBrowserAnalytics(), true);
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  assert.equal(canCaptureBrowserAnalytics(), true);
  for (const url of ['http://www.thearcades.me/stories', 'https://www.thearcades.me.evil.test/stories', 'https://preview.vercel.app/stories', 'http://localhost:3000/stories', 'https://user:password@www.thearcades.me/stories', 'https://thearcades.me/stories']) {
    dom.reconfigure({ url }); assert.equal(canCaptureBrowserAnalytics(), false, url);
  }
  dom.reconfigure({ url: `${origin}/stories` });
  process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
  assert.equal(canCaptureBrowserAnalytics(), false);
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  Object.assign(process.env, { NODE_ENV: 'development' });
  assert.equal(canCaptureBrowserAnalytics(), false);
});

test('the Vercel reducer removes query/hash and blocks private events after client navigation', (t) => {
  const dom = analyticsBrowser(t);
  assert.deepEqual(sanitizeVercelAnalyticsEvent({ type: 'pageview', url: `${origin}/stories?email=private#token` }), { type: 'pageview', url: `${origin}/stories` });
  assert.equal(sanitizeVercelAnalyticsEvent({ type: 'event', url: `${origin}/subscribe/verify#token` }), null);
  dom.reconfigure({ url: `${origin}/subscribe/unsubscribe#token` });
  assert.equal(sanitizeVercelAnalyticsEvent({ type: 'event', url: `${origin}/stories` }), null);
});
