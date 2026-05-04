import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { buildPostNewsletterContent, escapeHtml } from '@/lib/newsletter';
import { resolveGroupHeroForPost } from '@/lib/post-newsletter';
import type { Post } from '@/payload-types';

/**
 * Newsletter preview is a *local* render of the email HTML — no ActiveCampaign
 * roundtrip. AC owns the actual send to subscribers; previewing what the
 * subscriber will see only requires running our renderer and showing the
 * output in a browser tab. This trades AC-template fidelity (footer, link
 * tracking) for instant feedback and zero deliverability cost.
 */

const CRON_AUTH_HEADER = 'authorization';

async function authorizeBearerOrAdminSession(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get(CRON_AUTH_HEADER);
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  try {
    const payload = await getPayload({ config });
    const auth = await payload.auth({ headers: request.headers });
    if (auth.user) {
      return null;
    }
  } catch (err) {
    console.error('[newsletter-preview] payload.auth threw', err);
  }

  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

function parsePostId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function renderPreviewPage(args: {
  subject: string;
  htmlBody: string;
  postTitle: string;
  postPath: string;
}): string {
  // The body is wrapped in an "email card" framed against a neutral background
  // so the preview reads as an email rather than a webpage. The header strip
  // shows the subject line and post slug, mirroring the metadata a recipient
  // would see in their inbox.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Newsletter preview — ${escapeHtml(args.postTitle)}</title>
<style>
  body { margin: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; }
  .preview-bar { background: #111827; color: #f9fafb; padding: 0.75rem 1.25rem; font-size: 0.85rem; display: flex; gap: 1rem; align-items: baseline; }
  .preview-bar strong { font-weight: 600; }
  .preview-bar .slug { color: #9ca3af; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; }
  .subject { padding: 1rem 1.25rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
  .subject .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin: 0 0 0.25rem; }
  .subject h2 { margin: 0; font-size: 1.05rem; font-weight: 600; }
  .email-card { max-width: 640px; margin: 1.5rem auto 4rem; background: #fff; padding: 2rem 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
</style>
</head>
<body>
<div class="preview-bar">
  <strong>Newsletter preview</strong>
  <span class="slug">${escapeHtml(args.postPath)}</span>
</div>
<div class="subject">
  <p class="label">Subject</p>
  <h2>${escapeHtml(args.subject)}</h2>
</div>
<div class="email-card">
${args.htmlBody}
</div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const unauthorized = await authorizeBearerOrAdminSession(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const postId = parsePostId(url.searchParams.get('postId'));
  if (!postId) {
    return NextResponse.json(
      { error: 'A positive integer "postId" query param is required.' },
      { status: 400 },
    );
  }

  const payload = await getPayload({ config });

  let post: Post | null = null;
  try {
    // depth: 1 populates meta.image so the renderer can use the Media url/alt directly.
    post = (await payload.findByID({
      collection: 'posts',
      id: postId,
      draft: true,
      depth: 1,
      overrideAccess: true,
    })) as Post;
  } catch {
    post = null;
  }
  if (!post) {
    return NextResponse.json({ error: `No post with id ${postId}.` }, { status: 404 });
  }

  const group = await resolveGroupHeroForPost(payload, post);

  let htmlBody: string;
  try {
    const built = buildPostNewsletterContent({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? undefined,
      content: post.content as Parameters<typeof buildPostNewsletterContent>[0]['content'],
      meta: post.meta ?? null,
      group,
    });
    htmlBody = built.htmlBody;
  } catch (err) {
    console.error('[newsletter-preview] failed to render content', err);
    return NextResponse.json(
      { error: 'Failed to render newsletter content for this post.' },
      { status: 500 },
    );
  }

  const subject = (post.newsletterHeading ?? '').trim() || post.title;
  const postPath =
    group?.slug && typeof group.partIndex === 'number' && group.partIndex > 0
      ? `/projects/${group.slug}/${String(group.partIndex).padStart(2, '0')}`
      : '/projects';
  const page = renderPreviewPage({
    subject,
    htmlBody,
    postTitle: post.title,
    postPath,
  });

  return new Response(page, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
