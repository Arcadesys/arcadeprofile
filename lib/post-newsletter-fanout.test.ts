import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveAudiences,
  sendPostNewsletterFanOut,
  type PostNewsletterFanOutInput,
} from './post-newsletter-fanout';
import {
  ActiveCampaignError,
  type Audience,
  type SendBlogPostNewsletterOptions,
  type SendBlogPostNewsletterResult,
} from './activecampaign';

const baseInput: Omit<PostNewsletterFanOutInput, 'groupCategory'> = {
  subject: 'New post',
  htmlBody: '<p>body</p>',
  textBody: 'body',
  slug: 'my-slug',
  scheduledSendAt: new Date('2030-01-01T12:00:00Z'),
};

const LIST_IDS: Record<Audience, string> = {
  all: '7',
  fiction: '9',
  essays: '10',
};

function makeListIdResolver(): (audience: Audience) => string {
  return (audience) => LIST_IDS[audience];
}

function makeRecordingSender(): {
  send: (options: SendBlogPostNewsletterOptions) => Promise<SendBlogPostNewsletterResult>;
  calls: SendBlogPostNewsletterOptions[];
} {
  const calls: SendBlogPostNewsletterOptions[] = [];
  let counter = 0;
  return {
    calls,
    send: async (options) => {
      calls.push(options);
      counter += 1;
      return { messageId: `msg-${counter}`, campaignId: `camp-${counter}` };
    },
  };
}

test('resolveAudiences: fiction category -> [fiction, all]', () => {
  assert.deepEqual(resolveAudiences('fiction'), ['fiction', 'all']);
});

test('resolveAudiences: any non-fiction category -> [essays, all]', () => {
  for (const c of ['writing', 'tools', 'experiments', 'community', 'audio-video']) {
    assert.deepEqual(resolveAudiences(c), ['essays', 'all'], `category=${c}`);
  }
});

test('resolveAudiences: null category (no group) -> [essays, all]', () => {
  assert.deepEqual(resolveAudiences(null), ['essays', 'all']);
});

test('fanOut: fiction post sends to Fiction (id 9) and All (id 7) with audience-suffixed slugs', async () => {
  const { send, calls } = makeRecordingSender();
  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  assert.equal(result.allSucceeded, true);
  assert.deepEqual(result.audiences, ['fiction', 'all']);
  assert.equal(calls.length, 2);

  // Sends fire in parallel via Promise.allSettled, so call order isn't
  // guaranteed — assert by membership keyed off listIdOverride.
  const byList = new Map(calls.map((c) => [c.listIdOverride, c]));
  const fictionCall = byList.get('9');
  const allCall = byList.get('7');
  assert.ok(fictionCall, 'expected a send for Fiction list 9');
  assert.ok(allCall, 'expected a send for All list 7');
  assert.equal(fictionCall.slug, 'my-slug (Fiction)');
  assert.equal(fictionCall.subject, 'New post');
  assert.equal(fictionCall.htmlBody, '<p>body</p>');
  assert.equal(fictionCall.textBody, 'body');
  assert.equal(fictionCall.scheduledSendAt?.toISOString(), '2030-01-01T12:00:00.000Z');
  assert.equal(allCall.slug, 'my-slug (All)');

  // Result order mirrors the audiences array regardless of completion order.
  assert.deepEqual(
    result.results.map((r) => r.audience),
    ['fiction', 'all'],
  );
  assert.equal(result.failures.length, 0);
});

test('fanOut: essay post (writing category) sends to Essays (id 10) and All (id 7)', async () => {
  const { send, calls } = makeRecordingSender();
  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'writing' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  assert.equal(result.allSucceeded, true);
  assert.deepEqual(result.audiences, ['essays', 'all']);
  const listIds = new Set(calls.map((c) => c.listIdOverride));
  assert.deepEqual(listIds, new Set(['10', '7']));
  const byList = new Map(calls.map((c) => [c.listIdOverride, c]));
  assert.equal(byList.get('10')?.slug, 'my-slug (Essays)');
  assert.equal(byList.get('7')?.slug, 'my-slug (All)');
});

test('fanOut: post with no group falls under Essays + All', async () => {
  const { send, calls } = makeRecordingSender();
  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: null },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  assert.equal(result.allSucceeded, true);
  assert.deepEqual(new Set(calls.map((c) => c.listIdOverride)), new Set(['10', '7']));
});

test('fanOut: sends fire in parallel, not sequentially', async () => {
  // If the implementation awaited each send in turn, the second call would
  // start only after the first resolves. allSettled fires both immediately.
  const startedAt: number[] = [];
  let resolveFirst: ((v: SendBlogPostNewsletterResult) => void) | null = null;
  const send = (options: SendBlogPostNewsletterOptions): Promise<SendBlogPostNewsletterResult> => {
    startedAt.push(Date.now());
    if (options.listIdOverride === '9') {
      return new Promise<SendBlogPostNewsletterResult>((resolve) => {
        resolveFirst = resolve;
      });
    }
    return Promise.resolve({ messageId: 'm', campaignId: 'c' });
  };

  const fanOutPromise = sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  // Yield once so both microtasks scheduled by allSettled get to run.
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(startedAt.length, 2, 'both sends should have started before either resolves');

  resolveFirst!({ messageId: 'm9', campaignId: 'c9' });
  const result = await fanOutPromise;
  assert.equal(result.allSucceeded, true);
});

test('fanOut: one list failure does not short-circuit the other and allSucceeded is false', async () => {
  const calls: SendBlogPostNewsletterOptions[] = [];
  const send = async (options: SendBlogPostNewsletterOptions) => {
    calls.push(options);
    if (options.listIdOverride === '9') {
      throw new ActiveCampaignError('boom', 502, 'simulated');
    }
    return { messageId: 'm', campaignId: 'c' };
  };

  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  // Both audiences were attempted even though Fiction failed.
  assert.equal(calls.length, 2);
  assert.equal(result.allSucceeded, false);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].audience, 'fiction');
  assert.ok(result.failures[0].error instanceof ActiveCampaignError);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].audience, 'all');
});

test('fanOut: missing env var (getAudienceListId throws) is captured per-audience, not raised', async () => {
  const { send, calls } = makeRecordingSender();
  const resolveListId = (audience: Audience): string => {
    if (audience === 'all') {
      throw new ActiveCampaignError('Missing AC_LIST_ID_ALL environment variable');
    }
    return LIST_IDS[audience];
  };

  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: resolveListId },
  );

  // Fiction sent successfully; All failed at list-id resolution and never
  // hit the sender.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].listIdOverride, '9');
  assert.equal(result.allSucceeded, false);
  assert.deepEqual(result.failures.map((f) => f.audience), ['all']);
});

test('fanOut: every audience failing yields allSucceeded=false with both errors recorded', async () => {
  const send = async (): Promise<SendBlogPostNewsletterResult> => {
    throw new Error('AC down');
  };

  const result = await sendPostNewsletterFanOut(
    { ...baseInput, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  assert.equal(result.allSucceeded, false);
  assert.equal(result.failures.length, 2);
  assert.deepEqual(
    result.failures.map((f) => f.audience),
    ['fiction', 'all'],
  );
  assert.equal(result.results.length, 0);
});

test('fanOut: scheduledSendAt is forwarded as-is (clamping is the AC layer\'s job)', async () => {
  const { send, calls } = makeRecordingSender();
  const past = new Date('2000-01-01T00:00:00Z');
  await sendPostNewsletterFanOut(
    { ...baseInput, scheduledSendAt: past, groupCategory: 'fiction' },
    { sendBlogPostNewsletter: send, getAudienceListId: makeListIdResolver() },
  );

  for (const call of calls) {
    assert.equal(call.scheduledSendAt?.toISOString(), past.toISOString());
  }
});
