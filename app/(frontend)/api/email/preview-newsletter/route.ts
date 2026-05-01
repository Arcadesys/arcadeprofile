import { NextResponse } from 'next/server';
import { getPayload, type Payload } from 'payload';

import config from '@payload-config';
import { sendBlogPostNewsletter } from '@/lib/activecampaign';
import { authorizeCronRequest } from '@/lib/cronAuth';
import { buildPostNewsletterContent } from '@/lib/newsletter';
import {
  handleNewsletterPreviewRequest,
  type PreviewPost,
} from '@/lib/newsletter-preview-handler';
import type { Post } from '@/payload-types';

const CRON_AUTH_HEADER = 'authorization';

async function authorizeBearerOrAdminSession(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get(CRON_AUTH_HEADER);
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  // Fall back to a Payload admin session (cookie-based, used by the admin UI button).
  try {
    const payload = await getPayload({ config });
    const auth = await payload.auth({ headers: request.headers });
    if (auth.user) {
      return null;
    }
  } catch (err) {
    console.error('[newsletter-preview] payload.auth threw', err);
  }

  // Fall through to the bearer-style auth response so behavior matches /api/email/test for curl callers.
  if (authHeader) {
    return authorizeCronRequest(request);
  }
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

async function fetchPostForPreview(payload: Payload, postId: number): Promise<PreviewPost | null> {
  try {
    const doc = (await payload.findByID({
      collection: 'posts',
      id: postId,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })) as Post;
    if (!doc) return null;
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      newsletterHeading: doc.newsletterHeading ?? null,
      excerpt: doc.excerpt ?? null,
      content: doc.content,
    };
  } catch {
    return null;
  }
}

// POST-only: scheduling a campaign is a side-effecting write, so GET is not
// exposed to avoid accidental triggers from prefetchers or pasted URLs.
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  return handleNewsletterPreviewRequest(request, {
    authorizeRequest: authorizeBearerOrAdminSession,
    fetchPostForPreview: (postId) => fetchPostForPreview(payload, postId),
    sendBlogPostNewsletter,
    buildContent: (post) =>
      buildPostNewsletterContent({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? undefined,
        // buildPostNewsletterContent expects SerializedEditorState; the field
        // is typed as unknown here because the Payload Post type is awkward
        // to import in a route module — this matches the runtime shape.
        content: post.content as Parameters<typeof buildPostNewsletterContent>[0]['content'],
      }),
    getTestListId: () => process.env.AC_TEST_LIST_ID,
  });
}
