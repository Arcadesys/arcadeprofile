import assert from 'node:assert/strict';
import test from 'node:test';

import { createReaderEventTracker, type ReaderTelemetryProps } from './reader-analytics';

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
