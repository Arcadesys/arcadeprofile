import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsBrowser } from './fixtures/analytics-browser';

import {
  createReaderEventTracker,
  initializeReaderAnalytics,
  type ReaderTelemetryProps,
} from './reader-analytics';

const context = {
  canonicalId: '/essays/a-piece',
  contentType: 'essay',
  placement: 'reader',
  destination: 'none',
} as const;

test('reader telemetry emits only once for an event and context', () => {
  const sent: Array<{ event: string; properties: ReaderTelemetryProps }> = [];
  const tracker = createReaderEventTracker((event, properties) => sent.push({ event, properties }));

  assert.equal(tracker('reading-start', context), true);
  assert.equal(tracker('reading-start', context), false);
  assert.deepEqual(sent, [{ event: 'reading-start', properties: context }]);
});

test('reader telemetry keeps distinct destinations measurable', () => {
  const sent: string[] = [];
  const tracker = createReaderEventTracker((event) => sent.push(event));

  tracker('onward-reading', { ...context, placement: 'reader-navigation', destination: '/essays/next' });
  tracker('onward-reading', { ...context, placement: 'reader-navigation', destination: '/essays/another' });

  assert.deepEqual(sent, ['onward-reading', 'onward-reading']);
});

test('reader telemetry absorbs analytics sender failures', () => {
  const tracker = createReaderEventTracker(() => {
    throw new Error('analytics unavailable');
  });

  assert.doesNotThrow(() => tracker('signup-success', context));
  assert.equal(tracker('signup-success', context), false);
});

test('reader telemetry initializes the SDK queue before a cold-load event', (t) => {
  analyticsBrowser(t);
  let queueReady = false;
  const sent: string[] = [];

  initializeReaderAnalytics(() => { queueReady = true; });
  const tracker = createReaderEventTracker((event) => {
    if (!queueReady) throw new Error('Vercel queue was not ready');
    sent.push(event);
  });

  assert.equal(tracker('reading-start', context), true);
  assert.deepEqual(sent, ['reading-start']);
});

test('reader telemetry keeps a failed SDK initialization nonblocking', (t) => {
  analyticsBrowser(t);
  assert.doesNotThrow(() => {
    initializeReaderAnalytics(() => {
      throw new Error('analytics blocked');
    });
  });
});


test('early reader injection installs the reducer before tracking and never injects on preview/private paths', (t) => {
  const dom = analyticsBrowser(t);
  let calls = 0;
  initializeReaderAnalytics((options) => {
    calls += 1;
    assert.equal(options.framework, 'react');
    assert.deepEqual(options.beforeSend({ type: 'pageview', url: 'https://www.thearcades.me/stories?secret#token' }), { type: 'pageview', url: 'https://www.thearcades.me/stories' });
  });
  for (const url of ['https://preview.vercel.app/stories', 'https://www.thearcades.me/subscribe/verify#token']) {
    dom.reconfigure({ url });
    initializeReaderAnalytics(() => { calls += 1; });
  }
  assert.equal(calls, 1);
});
