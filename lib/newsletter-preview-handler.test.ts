import assert from 'node:assert/strict';
import test from 'node:test';

import { ActiveCampaignError } from './activecampaign';
import {
  handleNewsletterPreviewRequest,
  type NewsletterPreviewDeps,
  type PreviewPost,
} from './newsletter-preview-handler';

function makePost(overrides: Partial<PreviewPost> = {}): PreviewPost {
  return {
    id: 42,
    slug: 'hello-world',
    title: 'Hello World',
    excerpt: 'A short excerpt.',
    content: { root: { children: [], type: 'root', version: 1 } },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<NewsletterPreviewDeps> = {}): NewsletterPreviewDeps {
  return {
    authorizeRequest: async () => null,
    fetchPostForPreview: async () => makePost(),
    sendBlogPostNewsletter: async () => ({ messageId: 'msg-1', campaignId: 'camp-1' }),
    buildContent: () => ({ htmlBody: '<p>hi</p>', textBody: 'hi' }),
    getTestListId: () => '101',
    ...overrides,
  };
}

function postRequest(body: unknown): Request {
  return new Request('https://example.com/api/email/preview-newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('returns the auth response unchanged when authorization fails', async () => {
  const denial = new Response(JSON.stringify({ error: 'Unauthorized.' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
  const response = await handleNewsletterPreviewRequest(
    postRequest({ postId: 1 }),
    makeDeps({ authorizeRequest: async () => denial }),
  );
  assert.equal(response, denial);
});

test('returns 400 when postId is missing or invalid', async () => {
  const response = await handleNewsletterPreviewRequest(postRequest({}), makeDeps());
  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /postId/);
});

test('returns 500 when AC_TEST_LIST_ID is unset', async () => {
  const response = await handleNewsletterPreviewRequest(
    postRequest({ postId: 1 }),
    makeDeps({ getTestListId: () => undefined }),
  );
  assert.equal(response.status, 500);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /AC_TEST_LIST_ID/);
});

test('returns 404 when the post does not exist', async () => {
  const response = await handleNewsletterPreviewRequest(
    postRequest({ postId: 999 }),
    makeDeps({ fetchPostForPreview: async () => null }),
  );
  assert.equal(response.status, 404);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /No post with id 999/);
});

test('schedules the AC campaign with the rendered content and returns success metadata', async () => {
  type Captured = {
    subject: string;
    htmlBody: string;
    textBody: string;
    slug: string;
    scheduledSendAt?: Date;
    listIdOverride?: string;
  };
  const captured: { value: Captured | null } = { value: null };

  const post = makePost({ id: 7, slug: 'a-post', title: 'A Post', newsletterHeading: 'Special heading' });
  const response = await handleNewsletterPreviewRequest(
    postRequest({ postId: 7, delayMinutes: 5 }),
    makeDeps({
      fetchPostForPreview: async () => post,
      buildContent: () => ({ htmlBody: '<p>rendered</p>', textBody: 'rendered' }),
      sendBlogPostNewsletter: async (opts) => {
        captured.value = {
          subject: opts.subject,
          htmlBody: opts.htmlBody,
          textBody: opts.textBody,
          slug: opts.slug,
          scheduledSendAt: opts.scheduledSendAt,
          listIdOverride: opts.listIdOverride,
        };
        return { messageId: 'mid-7', campaignId: 'cid-7' };
      },
    }),
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ok: boolean;
    postId: number;
    postSlug: string;
    delayMinutes: number;
    listId: string;
    acCampaignId: string;
    acMessageId: string;
    firedAt: string;
    scheduledFor: string;
  };
  assert.equal(body.ok, true);
  assert.equal(body.postId, 7);
  assert.equal(body.postSlug, 'a-post');
  assert.equal(body.delayMinutes, 5);
  assert.equal(body.listId, '101');
  assert.equal(body.acCampaignId, 'cid-7');
  assert.equal(body.acMessageId, 'mid-7');

  const sent = captured.value;
  if (!sent) {
    assert.fail('sendBlogPostNewsletter should have been called');
  }
  assert.equal(sent.subject, '[Preview] Special heading');
  assert.equal(sent.htmlBody, '<p>rendered</p>');
  assert.equal(sent.textBody, 'rendered');
  assert.match(sent.slug, /^preview-a-post-\d+$/);
  assert.equal(sent.listIdOverride, '101');

  const firedAt = new Date(body.firedAt);
  const scheduledFor = new Date(body.scheduledFor);
  assert.equal(scheduledFor.getTime() - firedAt.getTime(), 5 * 60_000);
  assert.ok(sent.scheduledSendAt instanceof Date);
  assert.equal(sent.scheduledSendAt.toISOString(), scheduledFor.toISOString());
});

test('falls back to the post title when newsletterHeading is empty', async () => {
  let subject: string | undefined;
  await handleNewsletterPreviewRequest(
    postRequest({ postId: 1 }),
    makeDeps({
      fetchPostForPreview: async () => makePost({ newsletterHeading: '   ' }),
      sendBlogPostNewsletter: async (opts) => {
        subject = opts.subject;
        return { messageId: 'm', campaignId: 'c' };
      },
    }),
  );
  assert.equal(subject, '[Preview] Hello World');
});

test('clamps delayMinutes outside [1, 60] back into range', async () => {
  let observed: number | undefined;
  await handleNewsletterPreviewRequest(
    postRequest({ postId: 1, delayMinutes: 999 }),
    makeDeps({
      sendBlogPostNewsletter: async (opts) => {
        observed = opts.scheduledSendAt
          ? Math.round((opts.scheduledSendAt.getTime() - Date.now()) / 60_000)
          : undefined;
        return { messageId: 'm', campaignId: 'c' };
      },
    }),
  );
  assert.equal(observed, 60);
});

test('returns 502 with details when ActiveCampaign rejects the campaign', async () => {
  const response = await handleNewsletterPreviewRequest(
    postRequest({ postId: 1 }),
    makeDeps({
      sendBlogPostNewsletter: async () => {
        throw new ActiveCampaignError('campaign create failed (422)', 422, 'Invalid');
      },
    }),
  );
  assert.equal(response.status, 502);
  const body = (await response.json()) as { error: string; details?: string };
  assert.match(body.error, /campaign create failed/);
  assert.equal(body.details, 'Invalid');
});

test('returns 405 for unsupported methods', async () => {
  const response = await handleNewsletterPreviewRequest(
    new Request('https://example.com/api/email/preview-newsletter', { method: 'PUT' }),
    makeDeps(),
  );
  assert.equal(response.status, 405);
});
