import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { act, createElement as h, Fragment, StrictMode, Suspense, useInsertionEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { usePathname } from 'next/navigation';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { SiteAnalytics } from '../app/components/SiteAnalytics';
import { PostHogAnalytics } from '../app/components/PostHogAnalytics';
import { analyticsBrowser } from './fixtures/analytics-browser';
import { canCaptureBrowserAnalytics, sanitizeVercelAnalyticsEvent, shouldTrackSiteAnalytics } from './site-analytics';

/** Frozen pre-fix render condition: positive control for actual hydration recovery. */
function OriginalSiteAnalytics() {
  const pathname = usePathname();
  if (!shouldTrackSiteAnalytics(pathname) || !canCaptureBrowserAnalytics()) return null;
  return h(Fragment, null, h(Suspense, { fallback: null }, h(PostHogAnalytics)), h(Analytics, { beforeSend: sanitizeVercelAnalyticsEvent }));
}
function harness(t: TestContext, path = '/stories') {
  // JSDOM never executes/downloads inserted SDK scripts. All fetches are mocked.
  const dom = analyticsBrowser(t, path, '<div id="root"></div>');
  const sent: { event: string; properties: Record<string, unknown> }[] = [];
  const sdkCalls: { kind: string; value: unknown }[] = [];
  const errors: string[] = [], warnings: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body))); return new Response('{}');
  });
  t.mock.method(console, 'error', (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); });
  window.va = (kind, value) => { sdkCalls.push({ kind, value }); };
  const container = document.getElementById('root')!;
  const view = (component = SiteAnalytics, strict = false) => {
    const child = h(PathnameContext.Provider, { value: window.location.pathname }, h(component));
    return strict ? h(StrictMode, null, child) : child;
  };
  async function hydrate(component = SiteAnalytics, strict = false) {
    const element = view(component, strict);
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')!;
    Reflect.deleteProperty(globalThis, 'window');
    let serverMarkup: string;
    try { serverMarkup = renderToString(element); }
    finally { Object.defineProperty(globalThis, 'window', descriptor); }
    const browserServerMarkup = renderToString(element);
    assert.equal(sent.length, 0, 'No capture during SSR/initial render');
    assert.equal(sdkCalls.length, 0, 'No SDK hook during SSR/initial render');
    assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 0);
    container.innerHTML = serverMarkup;
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError(error) { errors.push(error instanceof Error ? error.message : String(error)); } });
      assert.equal(sent.length, 0, 'Hydration scheduling cannot capture before commit');
      assert.equal(sdkCalls.length, 0, 'Hydration scheduling cannot inject before commit');
    });
    return { root, serverMarkup, browserServerMarkup };
  }
  return { dom, sent, sdkCalls, errors, warnings, hydrate, view };
}

test('frozen render-time browser gate reproduces hydration recovery independently of storage', async (t) => {
  const f = harness(t);
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(f.dom.window, key, { configurable: true, get() { throw new Error('Storage deliberately unavailable'); } });
  const { root, serverMarkup, browserServerMarkup } = await f.hydrate(OriginalSiteAnalytics);
  try {
    assert.equal(serverMarkup, '');
    assert.notEqual(browserServerMarkup, serverMarkup, 'Original adds a Suspense boundary in the browser');
    assert.ok(f.errors.some((message) => /hydrat|didn't match/i.test(message)), 'Positive control observes actual React hydration recovery');
  } finally { await act(async () => root.unmount()); }
});

test('SiteAnalytics hydrates the server snapshot without recovery or duplicate Strict Mode capture', async (t) => {
  const f = harness(t, '/stories?email=private#local-test-token');
  const { root, serverMarkup, browserServerMarkup } = await f.hydrate(SiteAnalytics, true);
  try {
    assert.equal(serverMarkup, ''); assert.equal(browserServerMarkup, serverMarkup);
    assert.deepEqual(f.errors, []); assert.deepEqual(f.warnings, []);
    assert.deepEqual(f.sent.map(({ event }) => event), ['$pageview']);
    assert.equal(f.sent[0].properties.$current_url, 'https://www.thearcades.me/stories');
    assert.ok(f.sdkCalls.some(({ kind }) => kind === 'beforeSend'));
    assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 1);
  } finally { await act(async () => root.unmount()); }
});

test('hydrated SiteAnalytics preserves private-route gating through actual history back/forward', async (t) => {
  const f = harness(t); const { root } = await f.hydrate();
  try {
    async function navigate(path: string) { await act(async () => { window.history.pushState({}, '', path); root.render(f.view()); }); }
    assert.equal(f.sent.length, 1);
    await navigate('/subscribe/verify#local-test-token'); assert.equal(f.sent.length, 1);
    await navigate('/essays?email=private#local-test-token'); assert.equal(f.sent.length, 2);
    async function historyStep(direction: 'back' | 'forward') {
      await act(async () => {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Expected history popstate')), 1000);
          window.addEventListener('popstate', () => { clearTimeout(timeout); root.render(f.view()); resolve(); }, { once: true });
          window.history[direction]();
        });
      });
    }
    await historyStep('back'); assert.equal(window.location.pathname, '/subscribe/verify'); assert.equal(f.sent.length, 2);
    await historyStep('forward'); assert.equal(window.location.pathname, '/essays'); assert.equal(f.sent.length, 3);
    await act(async () => root.render(f.view())); assert.equal(f.sent.length, 3, 'Same-route rerender stays deduplicated');
    assert.deepEqual(f.sent.map(({ properties }) => properties.pathname), ['/stories', '/essays', '/essays']);
    assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 1);
    assert.deepEqual(f.errors, []); assert.deepEqual(f.warnings, []);
  } finally { await act(async () => root.unmount()); }
});

for (const scenario of [
  { name: 'preview host', url: 'https://preview.vercel.app/stories' },
  { name: 'localhost', url: 'http://localhost:3000/stories' },
  { name: 'URL credentials', url: 'https://user:password@www.thearcades.me/stories' },
  { name: 'HTTP production hostname', url: 'http://www.thearcades.me/stories' },
  { name: 'preview deployment', url: 'https://www.thearcades.me/stories', deployment: 'preview' },
  { name: 'verify token page', url: 'https://www.thearcades.me/subscribe/verify#local-test-token' },
  { name: 'unsubscribe token page', url: 'https://www.thearcades.me/subscribe/unsubscribe#local-test-token' },
  { name: 'unknown/private page', url: 'https://www.thearcades.me/projects/unknown/future' },
]) {
  test(`SiteAnalytics hydration remains quiet on ${scenario.name}`, async (t) => {
    const f = harness(t); f.dom.reconfigure({ url: scenario.url });
    if (scenario.deployment) process.env.NEXT_PUBLIC_VERCEL_ENV = scenario.deployment;
    const { root, serverMarkup, browserServerMarkup } = await f.hydrate();
    try {
      assert.equal(serverMarkup, ''); assert.equal(browserServerMarkup, serverMarkup);
      assert.deepEqual(f.errors, []); assert.deepEqual(f.warnings, []);
      assert.deepEqual(f.sent, []); assert.deepEqual(f.sdkCalls, []);
      assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 0);
    } finally { await act(async () => root.unmount()); }
  });
}


test('private-to-public navigation activates analytics when Next commits history after render', async (t) => {
  const f = harness(t, '/subscribe/verify#local-test-token');
  let target = '/subscribe/verify#local-test-token';
  function CommitOrderedNavigation() {
    // Mirrors installed Next HistoryUpdater: pathname context renders before
    // canonicalUrl is committed to window.history in useInsertionEffect.
    useInsertionEffect(() => { window.history.pushState({}, '', target); }, [target]);
    return h(PathnameContext.Provider, { value: target.split(/[?#]/, 1)[0] }, h(SiteAnalytics));
  }
  const { root } = await f.hydrate(CommitOrderedNavigation);
  try {
    assert.equal(f.sent.length, 0); assert.equal(f.sdkCalls.length, 0);
    target = '/stories';
    await act(async () => root.render(f.view(CommitOrderedNavigation)));
    assert.equal(window.location.pathname, '/stories');
    assert.deepEqual(f.sent.map(({ properties }) => properties.pathname), ['/stories']);
    assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 1);
    target = '/subscribe/unsubscribe#local-test-token';
    await act(async () => root.render(f.view(CommitOrderedNavigation)));
    assert.equal(window.location.pathname, '/subscribe/unsubscribe');
    assert.equal(f.sent.length, 1, 'Public-to-private commit must not capture');
    target = '/essays';
    await act(async () => root.render(f.view(CommitOrderedNavigation)));
    assert.deepEqual(f.sent.map(({ properties }) => properties.pathname), ['/stories', '/essays']);
    assert.equal(document.querySelectorAll('script[src="/_vercel/insights/script.js"]').length, 1);

    assert.deepEqual(f.errors, []); assert.deepEqual(f.warnings, []);
  } finally { await act(async () => root.unmount()); }
});
