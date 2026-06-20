import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Posts } from '../Posts';
import { promoteScheduledDraftHook } from './promoteScheduledDraft';
import { validateScheduledPublishDateHook } from './validateScheduledPublishDate';

// The hook is a Payload beforeChange hook; we only exercise a minimal arg, so
// cast through unknown rather than constructing a full hook context.
const run = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
  context: Record<string, unknown> = {},
) =>
  (
    validateScheduledPublishDateHook as unknown as (args: {
      context: Record<string, unknown>;
      data: Record<string, unknown>;
      originalDoc?: Record<string, unknown>;
    }) => unknown
  )({ context, data, originalDoc });

const past = '2020-01-01T00:00:00.000Z';
const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function hasValidationMessage(err: unknown, message: RegExp): boolean {
  const cause = (err as { cause?: { errors?: Array<{ message?: string }> } }).cause;
  return cause?.errors?.some((error) => message.test(error.message ?? '')) ?? false;
}

test('blocks scheduling a post with a past date', () => {
  assert.throws(
    () => run({ publish_status: 'scheduled', scheduledPublishDate: past }),
    /scheduledPublishDate/,
  );
});

test('allows scheduling a post with a future date', () => {
  assert.doesNotThrow(() => run({ publish_status: 'scheduled', scheduledPublishDate: future }));
});

test('blocks scheduling a post without a date', () => {
  assert.throws(
    () => run({ publish_status: 'scheduled' }),
    (err) => hasValidationMessage(err, /Scheduled Publish Date is required/),
  );
});

test('blocks scheduling a post with an invalid date', () => {
  assert.throws(
    () => run({ publish_status: 'scheduled', scheduledPublishDate: 'not-a-date' }),
    (err) => hasValidationMessage(err, /Scheduled Publish Date must be a valid date/),
  );
});

test('uses original scheduled date when validating partial scheduled edits', () => {
  assert.doesNotThrow(() =>
    run({ title: 'Edited title' }, { publish_status: 'scheduled', scheduledPublishDate: future }),
  );
});

test('allows drafts with a past date (editor staging)', () => {
  assert.doesNotThrow(() => run({ publish_status: 'draft', scheduledPublishDate: past }));
});

test('posts run scheduled promotion before scheduled date validation', () => {
  const hooks = Posts.hooks?.beforeChange ?? [];
  assert.equal(hooks[0], promoteScheduledDraftHook);
  assert.equal(hooks[1], validateScheduledPublishDateHook);
});

test('blocks draft plus past scheduled date once collection hooks promote it', () => {
  const data = { publish_status: 'draft', scheduledPublishDate: past };
  const promoted = promoteScheduledDraftHook({ data });

  assert.equal(promoted.publish_status, 'scheduled');
  assert.throws(() => run(promoted), /scheduledPublishDate/);
});

// Regression: the publish-scheduled cron promotes a `scheduled` post to
// `published` exactly when its date has just elapsed. Guarding terminal states
// for past dates broke that — every due post failed validation. See
// 63b69c8 / the publish-scheduled HTTP 500 incident.
test('allows promoting to published with a now-past scheduled date', () => {
  assert.doesNotThrow(() => run({ publish_status: 'published', scheduledPublishDate: past }));
});

test('allows sent posts with a past scheduled date', () => {
  assert.doesNotThrow(() => run({ publish_status: 'sent', scheduledPublishDate: past }));
});

// Partial update: editor moves the date to the past without re-sending
// publish_status. Status is recovered from originalDoc so the guard still fires.
test('blocks moving date to past on an already-scheduled post (status from originalDoc)', () => {
  assert.throws(
    () => run({ scheduledPublishDate: past }, { publish_status: 'scheduled' }),
    /scheduledPublishDate/,
  );
});

test('allows cron queue self-heal to intentionally write a due scheduled date', () => {
  assert.doesNotThrow(() =>
    run(
      { publish_status: 'scheduled', scheduledPublishDate: past },
      undefined,
      { allowPastScheduledPublishDate: true },
    ),
  );
});
