import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import type { Post } from '@/payload-types';
import { deliverPostNewsletter, type NewsletterDeliveryPayload } from './post-newsletter-delivery';

const EMPTY_CONTENT = {
  root: {
    type: 'root',
    children: [],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'A New Post',
    slug: 'new-post',
    excerpt: 'A short summary.',
    content: EMPTY_CONTENT as Post['content'],
    publishedDate: '2026-06-06T12:00:00.000Z',
    group: 'story-group',
    publish_status: 'published',
    updatedAt: '2026-06-06T12:00:00.000Z',
    createdAt: '2026-06-06T12:00:00.000Z',
    ...overrides,
  };
}

function makePayload(post: Post, category = 'fiction'): NewsletterDeliveryPayload {
  return {
    async find(args: { collection: string }) {
      if (args.collection === 'groups') {
        return {
          docs: [
            {
              slug: 'story-group',
              title: 'Story Group',
              category,
              image: null,
            },
          ],
        };
      }
      return { docs: [] };
    },
    async findByID() {
      return post;
    },
  } as unknown as NewsletterDeliveryPayload;
}

function setAudienceEnv() {
  process.env.AC_LIST_ID_ALL_PERPOST = '7';
  process.env.AC_LIST_ID_FICTION_PERPOST = '9';
  process.env.AC_LIST_ID_ESSAYS_PERPOST = '10';
}

afterEach(() => {
  delete process.env.AC_LIST_ID_ALL_PERPOST;
  delete process.env.AC_LIST_ID_FICTION_PERPOST;
  delete process.env.AC_LIST_ID_ESSAYS_PERPOST;
});

test('deliverPostNewsletter resolves AC recipients and sends with rendered post content', async () => {
  setAudienceEnv();
  const sent: Array<{ to: string[]; subject: string }> = [];
  const now = new Date('2026-06-06T13:00:00.000Z');

  const outcome = await deliverPostNewsletter(makePayload(makePost()), 1, {
    now: () => now,
    async resolveRecipients({ listIds }) {
      assert.deepEqual(listIds, ['7', '9']);
      return ['reader@example.com'];
    },
    async sendEmail(options) {
      sent.push({ to: options.to, subject: options.subject });
      assert.match(options.htmlBody, /A New Post/);
      assert.match(options.textBody, /A short summary/);
      return {
        messageIds: ['pm-1'],
        recipientCount: options.to.length,
      };
    },
  });

  assert.equal(outcome.kind, 'sent');
  assert.deepEqual(sent, [{ to: ['reader@example.com'], subject: 'A New Post' }]);
  if (outcome.kind === 'sent') {
    assert.deepEqual(outcome.state, {
      status: 'sent',
      messageId: 'pm-1',
      targetedLists: '7,9',
      recipientCount: 1,
      sentAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
      lastError: null,
    });
  }
});

test('deliverPostNewsletter skips suppressed posts', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const outcome = await deliverPostNewsletter(
    makePayload(makePost({ suppressNewsletter: true })),
    1,
    {
      now: () => now,
      async resolveRecipients() {
        throw new Error('should not resolve recipients');
      },
      async sendEmail() {
        throw new Error('should not send');
      },
    },
  );

  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') {
    assert.equal(outcome.reason, 'suppressNewsletter');
    assert.equal(outcome.state.status, 'skipped');
    assert.equal(outcome.state.lastSyncedAt, now.toISOString());
  }
});

test('deliverPostNewsletter records failed send state', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const outcome = await deliverPostNewsletter(makePayload(makePost()), 1, {
    now: () => now,
    async resolveRecipients() {
      return ['reader@example.com'];
    },
    async sendEmail() {
      throw new Error('Postmark down');
    },
  });

  assert.equal(outcome.kind, 'failed');
  if (outcome.kind === 'failed') {
    assert.equal(outcome.state.status, 'failed');
    assert.equal(outcome.state.lastSyncedAt, now.toISOString());
    assert.equal(outcome.state.lastError, 'Postmark down');
  }
});
