import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { act, createElement as h, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { PostHogAnalytics } from '../app/components/PostHogAnalytics';
import { MffAnalytics } from '../app/(frontend)/mff/MffAnalytics';
import ReaderTelemetry from '../app/components/ReaderTelemetry';
import { useReaderEventTracker } from './reader-analytics';
import { analyticsBrowser } from './fixtures/analytics-browser';

function observerMock(t: TestContext) {
  const instances: MockObserver[] = [];
  class MockObserver {
    targets = new Set<Element>();
    constructor(readonly callback: IntersectionObserverCallback) { instances.push(this); }
    observe(element: Element) { this.targets.add(element); }
    disconnect() { this.targets.clear(); }
    fire() { if (this.targets.size) this.callback([...this.targets].map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry), this as unknown as IntersectionObserver); }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: MockObserver });
  t.after(() => previous ? Object.defineProperty(globalThis, 'IntersectionObserver', previous) : Reflect.deleteProperty(globalThis, 'IntersectionObserver'));
  return () => instances.forEach((observer) => observer.fire());
}

function captureMock(t: TestContext) {
  const sent: { event: string; properties: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return new Response('{}'); });
  return sent;
}

test('site pageviews are once per path transition, including mocked back/forward and a genuine remount', async (t) => {
  const dom = analyticsBrowser(t, '/stories', '<div id="root"></div>');
  const sent = captureMock(t);
  const root = createRoot(document.getElementById('root')!);
  const render = async (path: string, key = 'mounted-layout') => {
    dom.reconfigure({ url: `https://www.thearcades.me${path}` });
    await act(async () => root.render(h(StrictMode, null, h(PathnameContext.Provider, { value: window.location.pathname }, h(PostHogAnalytics, { key })))));
  };
  await render('/stories'); await render('/stories?secret#token');
  assert.deepEqual(sent.map(({ properties }) => properties.pathname), ['/stories']);
  await render('/essays'); await render('/stories'); await render('/essays');
  assert.deepEqual(sent.map(({ properties }) => properties.pathname), ['/stories', '/essays', '/stories', '/essays']);
  await render('/subscribe/verify#token'); await render('/stories');
  await render('/stories', 'real-remount');
  assert.equal(sent.length, 6);
  await act(async () => root.unmount());
});

test('reader participation preserves matching content/page identity in either effect order', async (t) => {
  const path = '/novels/it-takes-a-zoo/cold-boot';
  analyticsBrowser(t, `${path}?utm_campaign=analytics-verification`, '<div id="root"></div>');
  const sent = captureMock(t);
  observerMock(t);
  const root = createRoot(document.getElementById('root')!);
  for (const readerFirst of [true, false]) {
    const reader = h(ReaderTelemetry, { key: 'reader', canonicalId: path, contentType: 'chapter', placement: 'reader-body', destination: 'none', children: 'Public body' });
    const page = h(PostHogAnalytics, { key: 'page' });
    await act(async () => root.render(h(PathnameContext.Provider, { value: path }, h('div', { key: String(readerFirst) }, ...(readerFirst ? [reader, page] : [page, reader])))));
    const pair = sent.slice(-2);
    assert.deepEqual(pair.map(value => value.event), readerFirst ? ['reading-start', '$pageview'] : ['$pageview', 'reading-start']);
    assert.ok(pair.every(value => value.properties.pathname === path && value.properties.utm_campaign === 'analytics-verification'));
    assert.equal(pair[0].properties.$session_id, pair[1].properties.$session_id);
    assert.equal(pair.find(value => value.event === 'reading-start')?.properties.canonicalId, path);
  }
  await act(async () => root.unmount());
});

test('reader start/end, onward/resume and signup intent retain one receipt per mounted control/context', async (t) => {
  analyticsBrowser(t, '/novels/it-takes-a-zoo/cold-boot', '<div id="root"></div>');
  const sent = captureMock(t);
  const intersect = observerMock(t);
  const queue: { kind: string; value: unknown }[] = [];
  window.va = (kind, value) => { queue.push({ kind, value }); };
  const reader = { canonicalId: '/novels/it-takes-a-zoo/cold-boot', contentType: 'chapter', placement: 'reader-body', destination: 'none' };
  function Actions() {
    const track = useReaderEventTracker();
    useEffect(() => {
      const next = { ...reader, placement: 'next-chapter', destination: '/stories' };
      track('onward-reading', next); track('onward-reading', next);
      track('onward-reading', { ...next, destination: '/essays' });
      track('resume-click', { ...reader, contentType: 'reading-hub', placement: 'resume-banner', destination: '/stories' });
      track('signup-success', { ...reader, contentType: 'subscription', placement: 'footer', destination: '/writing' });
    }, [track]);
    return null;
  }
  const root = createRoot(document.getElementById('root')!);
  const render = async (key: string) => act(async () => root.render(h(StrictMode, null, h('div', { key }, h(ReaderTelemetry, { ...reader, children: 'A public reader body' }), h(Actions)))));
  await render('visit-1');
  await act(async () => { intersect(); intersect(); });
  const names = sent.map(({ event }) => event);
  assert.equal(names.filter((name) => name === 'reading-start').length, 1);
  assert.equal(names.filter((name) => name === 'end-reached').length, 1);
  assert.equal(names.filter((name) => name === 'onward-reading').length, 2);
  assert.equal(names.filter((name) => name === 'resume-click').length, 1);
  assert.equal(names.filter((name) => name === 'signup confirmation requested').length, 1);
  assert.equal(sent.find(({ event }) => event === 'end-reached')?.properties.placement, 'reader-end');
  const firstEvent = queue.findIndex(({ kind }) => kind === 'event');
  assert.ok(firstEvent > 0); assert.equal(queue[0].kind, 'beforeSend');
  assert.equal(queue.filter(({ kind }) => kind === 'event').length, 6);
  assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 1);
  await render('visit-1'); assert.equal(sent.length, 6);
  await render('back-to-reader'); await act(async () => { intersect(); });
  assert.equal(sent.length, 12);
  await act(async () => root.unmount());
});

test('MFF Strict Mode replays, intersections, scrolls and remount keep original event units', async (t) => {
  const dom = analyticsBrowser(t, '/mff?utm_campaign=professional_handoff#token', '<div id="mff-page"><h2>Name the harm</h2><figure><figcaption><p>Exhibit 06 · Fiction</p><h3>It Takes a Zoo</h3></figcaption></figure><a id="next" href="/stories?email=secret#token">Start here</a><details></details><div id="root"></div></div>');
  const sent = captureMock(t);
  const intersect = observerMock(t);
  const root = createRoot(document.getElementById('root')!);
  await act(async () => root.render(h(StrictMode, null, h(MffAnalytics, { key: 'first' }))));
  await act(async () => { intersect(); intersect(); window.dispatchEvent(new dom.window.Event('scroll')); });
  assert.equal(sent.filter(({ event }) => event === 'mff page viewed').length, 1);
  assert.equal(sent.filter(({ event }) => event === 'mff scroll reached').length, 5);
  assert.equal(sent.filter(({ event }) => event === 'mff section viewed').length, 1);
  assert.equal(sent.filter(({ event }) => event === 'mff exhibit viewed').length, 1);
  const link = document.getElementById('next')!;
  link.addEventListener('click', (event) => event.preventDefault());
  await act(async () => { link.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); link.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  assert.equal(sent.filter(({ event }) => event === 'mff link clicked').length, 2);
  assert.equal(sent.find(({ event }) => event === 'mff link clicked')?.properties.href, '/stories');
  const details = document.querySelector('details')!;
  await act(async () => { details.open = true; details.dispatchEvent(new dom.window.Event('toggle')); });
  assert.ok(sent.some(({ event }) => event === 'mff sources opened'));
  await act(async () => root.render(h(StrictMode, null, h(MffAnalytics, { key: 'return-visit' }))));
  assert.equal(sent.filter(({ event }) => event === 'mff page viewed').length, 2);
  await act(async () => root.unmount());
  const count = sent.length;
  window.dispatchEvent(new dom.window.Event('scroll')); intersect();
  assert.equal(sent.length, count);
});
