import assert from 'node:assert/strict';
import test from 'node:test';
import { captureSiteEvent, captureMffEvent } from './posthog-client';
import { isAnalyticsId, sanitizeAnalyticsPayload } from './analytics-payload';
import { isAnalyticsSessionId, readAnalyticsSession, SESSION_IDLE_MS } from './analytics-session';
import { analyticsBrowser } from './fixtures/analytics-browser';

const id = '9e833036-9f38-44d9-9d26-3d9c1b332f94';

test('client sanitizes storage, preserves valid existing IDs/session and current context wins', (t) => {
  analyticsBrowser(t, '/stories?email=private#token');
  window.localStorage.setItem('arcade-posthog-anonymous-id', id);
  const session = readAnalyticsSession(window.sessionStorage, 'arcade-posthog-session-v2').session;
  window.sessionStorage.setItem('arcade-posthog-window-id', id);
  window.sessionStorage.setItem('arcade-posthog-entry', JSON.stringify({ landing_page: '/mff', pathname: '/subscribe/verify', $current_url: 'https://evil.test/secret', $referrer: 'https://source.example/private?secret#token', utm_campaign: 'professional_handoff', utm_content: 'start_entry', email: 'private@example.com', $set: { secret: true }, $session_id: 'forged' }));
  const sent: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return new Response('{}'); });
  captureSiteEvent('$pageview', { injected: 'private' });
  captureSiteEvent('$pageview');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].distinct_id, id);
  const props = sent[0].properties as Record<string, unknown>;
  assert.equal(props.$session_id, session.id); assert.equal(props.$window_id, id); assert.equal(props.landing_page, '/mff'); assert.equal(props.pathname, '/stories');
  assert.equal(props.session_model, 'tab_uuidv7_v2');
  assert.equal(props.$current_url, 'https://www.thearcades.me/stories'); assert.equal(props.$referrer, 'https://source.example'); assert.equal(props.utm_content, 'start_entry');
  assert.ok(!JSON.stringify(sent).includes('secret')); assert.ok(!JSON.stringify(sent).includes('private'));
  const saved = JSON.parse(window.sessionStorage.getItem('arcade-posthog-entry')!);
  assert.equal(saved.email, undefined); assert.equal(saved.$current_url, undefined);
});

test('invalid stored IDs/entry are replaced with the original UUID persistence/session scopes', (t) => {
  analyticsBrowser(t, '/stories?utm_source=SAFE&utm_campaign=professional_handoff&utm_content=home_header&utm_term=email%40example.com#token', '', 'https://example.com/private?email=secret#token');
  window.localStorage.setItem('arcade-posthog-anonymous-id', 'private@example.com');
  window.sessionStorage.setItem('arcade-posthog-session-id', 'token');
  window.sessionStorage.setItem('arcade-posthog-entry', JSON.stringify(['private']));
  const sent: { properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return new Response('{}'); });
  captureSiteEvent('$pageview');
  assert.ok(isAnalyticsId(window.localStorage.getItem('arcade-posthog-anonymous-id')));
  assert.ok(isAnalyticsSessionId(sent[0].properties.$session_id));
  assert.ok(isAnalyticsId(sent[0].properties.$window_id));
  assert.equal(sent[0].properties.utm_content, 'home_header'); assert.equal(sent[0].properties.utm_source, 'safe'); assert.equal(sent[0].properties.utm_term, undefined);
  assert.equal(sent[0].properties.$referrer, 'https://example.com'); assert.equal(sent[0].properties.landing_page, '/stories');
});

test('disabled browser context sends no events and creates no identity/entry storage', (t) => {
  const dom = analyticsBrowser(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  for (const url of ['https://preview.vercel.app/stories', 'https://www.thearcades.me/unknown', 'https://www.thearcades.me/subscribe/verify#token']) {
    dom.reconfigure({ url }); captureSiteEvent('$pageview'); captureMffEvent('mff page viewed');
    assert.equal(window.localStorage.length, 0); assert.equal(window.sessionStorage.length, 0);
  }
  assert.equal(fetch.mock.calls.length, 0);
});

test('MFF client sends sanitized public labels and never adds sitewide session IDs', (t) => {
  analyticsBrowser(t, '/mff?private#token', '', 'https://example.com/private?secret#token');
  const sent: { properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { assert.equal(url, '/api/analytics/mff'); sent.push(JSON.parse(String(init.body))); return new Response('{}'); });
  captureMffEvent('mff link clicked', { href: 'https://example.com/private?email=secret#token', label: 'Start here', email: 'private@example.com' });
  assert.equal(sent[0].properties.href, 'https://example.com'); assert.equal(sent[0].properties.$referrer, 'https://example.com'); assert.equal(sent[0].properties.label, 'Start here');
  assert.equal(sent[0].properties.$session_id, undefined); assert.equal(sent[0].properties.landing_page, undefined); assert.equal(window.sessionStorage.length, 0);
  assert.ok(!JSON.stringify(sent).includes('secret')); assert.ok(!JSON.stringify(sent).includes('private'));
});

test('capture remains fire-and-forget on 204/400/403/502 and rejected fetch, with no retries', async (t) => {
  analyticsBrowser(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  for (const status of [204, 400, 403, 502]) {
    fetch.mock.mockImplementation(async () => new Response(null, { status }));
    assert.doesNotThrow(() => captureSiteEvent('$pageview'));
  }
  fetch.mock.mockImplementation(async () => { throw new Error('blocked'); });
  assert.doesNotThrow(() => captureSiteEvent('$pageview'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(fetch.mock.calls.length, 5);
});

test('legacy v4 session migrates while visitor is preserved and idle entry attribution resets', (t) => {
  const dom = analyticsBrowser(t, '/stories?utm_source=first');
  let now = 1_790_000_000_000;
  t.mock.method(Date, 'now', () => now);
  window.localStorage.setItem('arcade-posthog-anonymous-id', id);
  window.sessionStorage.setItem('arcade-posthog-session-id', id);
  const sent: { distinct_id: string; properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return new Response('{}'); });
  captureSiteEvent('$pageview');
  now += 1000;
  dom.reconfigure({ url: 'https://www.thearcades.me/essays?utm_source=second' });
  captureSiteEvent('$pageview');
  assert.equal(sent[0].properties.$session_id, sent[1].properties.$session_id);
  assert.equal(sent[1].properties.landing_page, '/stories');
  now += SESSION_IDLE_MS;
  captureSiteEvent('$pageview');
  assert.ok(sent.every(value => value.distinct_id === id));
  assert.ok(isAnalyticsSessionId(sent[0].properties.$session_id));
  assert.notEqual(sent[0].properties.$session_id, id);
  assert.notEqual(sent[2].properties.$session_id, sent[0].properties.$session_id);
  assert.equal(sent[2].properties.$window_id, sent[0].properties.$window_id);
  assert.equal(sent[2].properties.landing_page, '/essays'); assert.equal(sent[2].properties.utm_source, 'second');
});

test('receiver sanitizer accepts UUIDv7 sessions without accepting v7 visitor identities', () => {
  const session = readAnalyticsSession(null, 'session').session;
  const properties = { $current_url: 'https://www.thearcades.me/stories', $session_id: session.id, $window_id: id };
  // Validate exactly the shared boundary used by the HTTP receiver.
  assert.equal(sanitizeAnalyticsPayload({ event: '$pageview', distinct_id: id, properties }, 'sitewide')?.properties.$session_id, session.id);
  assert.equal(sanitizeAnalyticsPayload({ event: '$pageview', distinct_id: session.id, properties }, 'sitewide'), null);
});
