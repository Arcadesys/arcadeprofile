import assert from 'node:assert/strict';
import test from 'node:test';
import type { SerializedEditorState } from 'lexical';
import type { Payload } from 'payload';

import { ActiveCampaignError } from './activecampaign';
import { sendPostPreview } from './send-preview';
import type { PostmarkSendEmailResponse, SendPostmarkTransactionalEmailOptions } from './postmark';

const EMPTY_LEXICAL: SerializedEditorState = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [],
    direction: null,
  } as unknown as SerializedEditorState['root'],
};

function makePayload(groupCategory: string | null = 'fiction'): Payload {
  return {
    async findByID() {
      return {
        id: 1,
        title: 'Preview Me',
        slug: 'preview-me',
        excerpt: 'A preview.',
        content: EMPTY_LEXICAL,
        group: 'story',
      };
    },
    async find() {
      return {
        docs: [
          {
            title: 'Story',
            slug: 'story',
            category: groupCategory,
            image: null,
          },
        ],
      };
    },
  } as unknown as Payload;
}

function postmarkResponse(to: string): PostmarkSendEmailResponse {
  return {
    ErrorCode: 0,
    Message: 'OK',
    MessageID: 'pm-preview',
    SubmittedAt: '2026-06-06T12:00:00.000Z',
    To: to,
  } as PostmarkSendEmailResponse;
}

test('sendPostPreview sends a direct Postmark preview without requiring AC list env', async () => {
  const sentCalls: SendPostmarkTransactionalEmailOptions[] = [];

  const result = await sendPostPreview({
    postId: 1,
    to: 'reader@example.com',
    payload: makePayload('fiction'),
    deps: {
      resolveTargetedLists() {
        throw new ActiveCampaignError('Missing AC_LIST_ID_ALL_PERPOST environment variable');
      },
      async sendEmail(options) {
        sentCalls.push(options);
        return postmarkResponse(options.to);
      },
    },
  });

  assert.equal(result.messageId, 'pm-preview');
  assert.equal(result.groupCategory, 'fiction');
  assert.deepEqual(result.targetedLists, []);
  const sent = sentCalls[0];
  assert.ok(sent);
  assert.equal(sent?.to, 'reader@example.com');
  assert.equal(sent?.subject, '[Preview — Fiction] Preview Me');
  assert.match(sent?.textBody ?? '', /Preview Me/);
});

test('sendPostPreview reports configured audience lists when available', async () => {
  const result = await sendPostPreview({
    postId: 1,
    to: 'reader@example.com',
    payload: makePayload('essay'),
    deps: {
      resolveTargetedLists(groupCategory) {
        assert.equal(groupCategory, 'essay');
        return ['7', '10'];
      },
      async sendEmail(options) {
        return postmarkResponse(options.to);
      },
    },
  });

  assert.deepEqual(result.targetedLists, ['7', '10']);
  assert.equal(result.groupCategory, 'essay');
});
