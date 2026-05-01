import { NextResponse } from 'next/server';

import type {
  SendBlogPostNewsletterOptions,
  SendBlogPostNewsletterResult,
} from '@/lib/activecampaign';
import { ActiveCampaignError } from '@/lib/activecampaign';

export type PreviewPost = {
  id: number;
  slug: string;
  title: string;
  newsletterHeading?: string | null;
  excerpt?: string | null;
  content: unknown;
};

export type NewsletterPreviewDeps = {
  /** Returns null if the caller is authorized; otherwise a 401-style Response. */
  authorizeRequest: (request: Request) => Promise<Response | null>;
  /** Loads a post for preview rendering. Returns null when the post does not exist. */
  fetchPostForPreview: (postId: number) => Promise<PreviewPost | null>;
  /** Real AC sender; injected for tests. */
  sendBlogPostNewsletter: (
    options: SendBlogPostNewsletterOptions,
  ) => Promise<SendBlogPostNewsletterResult>;
  /** Builds the rendered newsletter HTML/text the preview will email. */
  buildContent: (post: PreviewPost) => { htmlBody: string; textBody: string };
  /** Returns AC_TEST_LIST_ID at call time so tests can stub env. */
  getTestListId: () => string | undefined;
};

const DEFAULT_DELAY_MINUTES = 1;
const MIN_DELAY_MINUTES = 1;
const MAX_DELAY_MINUTES = 60;

function clampDelay(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(MAX_DELAY_MINUTES, Math.max(MIN_DELAY_MINUTES, Math.floor(raw)));
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(MAX_DELAY_MINUTES, Math.max(MIN_DELAY_MINUTES, parsed));
    }
  }
  return DEFAULT_DELAY_MINUTES;
}

function parsePostId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

type ParsedInput = { postId: number; delayMinutes: number };

async function getInput(
  request: Request,
): Promise<ParsedInput | { error: string; status: number }> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const postId = parsePostId(url.searchParams.get('postId'));
    if (!postId) {
      return { error: 'A positive integer "postId" is required.', status: 400 };
    }
    return {
      postId,
      delayMinutes: clampDelay(url.searchParams.get('delayMinutes')),
    };
  }

  if (request.method === 'POST') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { error: 'Request body must be valid JSON.', status: 400 };
    }
    const obj = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const postId = parsePostId(obj.postId);
    if (!postId) {
      return { error: 'A positive integer "postId" is required.', status: 400 };
    }
    return {
      postId,
      delayMinutes: clampDelay(obj.delayMinutes),
    };
  }

  return { error: 'Method not allowed.', status: 405 };
}

export async function handleNewsletterPreviewRequest(
  request: Request,
  deps: NewsletterPreviewDeps,
): Promise<Response> {
  const unauthorizedResponse = await deps.authorizeRequest(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const input = await getInput(request);
  if ('error' in input) {
    return NextResponse.json({ error: input.error }, { status: input.status });
  }

  const listId = deps.getTestListId()?.trim();
  if (!listId) {
    return NextResponse.json(
      {
        error:
          'AC_TEST_LIST_ID is not configured. Create a single-recipient AC test list and set AC_TEST_LIST_ID before previewing.',
      },
      { status: 500 },
    );
  }

  const post = await deps.fetchPostForPreview(input.postId);
  if (!post) {
    return NextResponse.json(
      { error: `No post with id ${input.postId}.` },
      { status: 404 },
    );
  }

  const firedAt = new Date();
  const scheduledFor = new Date(firedAt.getTime() + input.delayMinutes * 60_000);
  const subject = `[Preview] ${(post.newsletterHeading ?? '').trim() || post.title}`;
  const slug = `preview-${post.slug}-${firedAt.getTime()}`;

  let content: { htmlBody: string; textBody: string };
  try {
    content = deps.buildContent(post);
  } catch (err) {
    console.error('[newsletter-preview] Failed to render post content', err);
    return NextResponse.json(
      { error: 'Failed to render newsletter content for this post.' },
      { status: 500 },
    );
  }

  try {
    const result = await deps.sendBlogPostNewsletter({
      subject,
      htmlBody: content.htmlBody,
      textBody: content.textBody,
      slug,
      scheduledSendAt: scheduledFor,
      listIdOverride: listId,
    });

    console.log(
      '[newsletter-preview]',
      JSON.stringify({
        postId: post.id,
        postSlug: post.slug,
        firedAt: firedAt.toISOString(),
        scheduledFor: scheduledFor.toISOString(),
        delayMinutes: input.delayMinutes,
        listId,
        acCampaignId: result.campaignId,
        acMessageId: result.messageId,
      }),
    );

    return NextResponse.json({
      ok: true,
      postId: post.id,
      postSlug: post.slug,
      firedAt: firedAt.toISOString(),
      scheduledFor: scheduledFor.toISOString(),
      delayMinutes: input.delayMinutes,
      listId,
      acCampaignId: result.campaignId,
      acMessageId: result.messageId,
    });
  } catch (err) {
    if (err instanceof ActiveCampaignError) {
      console.error('[newsletter-preview] ActiveCampaign rejected the preview', err);
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: 502 },
      );
    }
    console.error('[newsletter-preview] Unexpected failure', err);
    return NextResponse.json(
      { error: 'Failed to schedule newsletter preview.' },
      { status: 502 },
    );
  }
}
