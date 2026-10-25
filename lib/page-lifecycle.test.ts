import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement as h, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { PostHogAnalytics } from '../app/components/PostHogAnalytics';
import { analyticsBrowser } from './fixtures/analytics-browser';
import { observePageLifecycle, type PageLeave } from './page-lifecycle';
import { SESSION_IDLE_MS } from './analytics-session';

test('visibility pauses visible time; pagehide/cleanup dedupe; BFCache gets a fresh visit', (t) => {
  const dom = analyticsBrowser(t); let now = 0; let visible = 'visible'; let views = 0;
  t.mock.method(window.performance, 'now', () => now);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible });
  const leaves: PageLeave[] = [];
  const stop = observePageLifecycle(window, document, () => { views++; return value => leaves.push(value); });
  now = 3000; visible = 'hidden'; document.dispatchEvent(new dom.window.Event('visibilitychange'));
  now = 13000; visible = 'visible'; document.dispatchEvent(new dom.window.Event('visibilitychange'));
  now = 15000; window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  assert.deepEqual(leaves, [{ lifecycle_reason: 'pagehide', visible_seconds: 5, $prev_pageview_duration: 15 }]);
  window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(views, 2);
  now = 17000; stop('navigation'); stop('unmount');
  assert.equal(leaves.length, 2); assert.equal(leaves[1].visible_seconds, 2);
  window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(views, 2);
});

test('rollback and suspended/idle page visits emit no invented duration', (t) => {
  analyticsBrowser(t); let now = 100;
  t.mock.method(window.performance, 'now', () => now);
  const leaves: PageLeave[] = [];
  let stop = observePageLifecycle(window, document, () => value => leaves.push(value));
  now = 50; stop();
  stop = observePageLifecycle(window, document, () => value => leaves.push(value));
  now += SESSION_IDLE_MS; stop(); assert.equal(leaves.length, 0);
});

test('Strict Mode and SPA navigation keep one view/leave and original sanitized context; private routes stay excluded', async (t) => {
  const dom = analyticsBrowser(t, '/?utm_source=NEWS&utm_medium=email', '<div id="root"></div>', 'https://www.google.com/private?q=secret');
  const sent: { event: string; uuid: string; timestamp: string; properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init?.body))); return new Response('{}'); });
  const root = createRoot(document.getElementById('root')!);
  const render = async (url: string) => {
    dom.reconfigure({ url });
    await act(async () => root.render(h(StrictMode, null, h(PathnameContext.Provider, { value: window.location.pathname }, h(PostHogAnalytics)))));
  };
  await render('https://www.thearcades.me/?utm_source=NEWS&utm_medium=email');
  await render('https://www.thearcades.me/?private=secret#token');
  assert.deepEqual(sent.map(value => value.event), ['$pageview']);
  await render('https://www.thearcades.me/stories?utm_source=replace');
  assert.deepEqual(sent.map(value => value.event), ['$pageview', '$pageleave', '$pageview']);
  assert.equal(sent[1].properties.pathname, '/');
  assert.equal(sent[1].properties.$pageview_id, sent[0].properties.$pageview_id);
  assert.notEqual(sent[0].uuid, sent[1].uuid);
  assert.equal(sent[2].properties.$referring_domain, 'www.google.com');
  assert.equal(sent[2].properties.utm_source, 'news');
  assert.equal(sent[2].properties.landing_page, '/');
  assert.equal(sent[2].properties.$session_id, sent[0].properties.$session_id);
  await render('https://www.thearcades.me/subscribe/verify#private-token');
  assert.equal(sent.at(-1)?.event, '$pageleave');
  const count = sent.length; await act(async () => root.unmount()); assert.equal(sent.length, count);
  assert.ok(!JSON.stringify(sent).includes('secret')); assert.ok(!JSON.stringify(sent).includes('private-token'));
});

test('homepage CTA keyboard activation retains safe placement, never prevents navigation, and stays nonblocking on failure', async (t) => {
  const dom = analyticsBrowser(t, '/', '<a id="sample" href="/stories?private#token" data-analytics-placement="home_sample">Read</a><div id="root"></div>');
  const sent: { event: string; uuid: string; properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init?.body))); return new Response(null, { status: 502 }); });
  const root = createRoot(document.getElementById('root')!);
  await act(async () => root.render(h(PathnameContext.Provider, { value: '/' }, h(PostHogAnalytics))));
  const link = document.getElementById('sample')!;
  let navigationAllowed = false;
  // Fixture-only last listener suppresses jsdom navigation, after observing
  // whether analytics left the browser's default keyboard activation intact.
  document.addEventListener('click', event => { navigationAllowed = !event.defaultPrevented; event.preventDefault(); }, { once: true });
  const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }); // Browser keyboard activation.
  link.dispatchEvent(event); assert.equal(navigationAllowed, true);
  const click = sent.find(value => value.event === 'site link clicked');
  assert.equal(click?.properties.href, '/stories'); assert.equal(click?.properties.placement, 'home_sample');
  assert.ok(click?.uuid); assert.ok(!JSON.stringify(sent).includes('private'));
  await act(async () => root.unmount());
});
