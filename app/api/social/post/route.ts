import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug } from '@/lib/blog';
import { readMarketing, writeMarketing } from '@/lib/marketing';
import { createPost, postToBluesky, atUriToWebUrl } from '@/lib/bluesky';
import {
  addHistoryEntry,
  generateId,
  SocialPlatform,
  PostVariant,
} from '@/lib/social';

const SITE_URL = 'https://thearcades.me';

interface ComposePostRequest {
  text: string;
  platform: SocialPlatform;
  variant?: PostVariant;
  slug?: string;
  linkUrl?: string;
  scheduledAt?: string;
}

/** Marketing-driven post: slug + short|long variant, no freeform text body. */
async function handleMarketingPost(body: {
  slug: string;
  platform: string;
  variant: 'short' | 'long';
}) {
  const { slug, platform } = body;

  if (platform !== 'bluesky') {
    return NextResponse.json({ error: 'Unsupported platform. Supported: bluesky' }, { status: 400 });
  }

  const post = getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: `Post not found: ${slug}` }, { status: 404 });
  }

  const marketing = readMarketing(slug);

  // Read from new channels structure, fall back to legacy social fields
  let copyText: string | undefined;
  if (marketing?.channels?.bluesky?.text) {
    copyText = marketing.channels.bluesky.text;
  } else if (marketing?.social?.short) {
    copyText = marketing.social.short;
  } else if (marketing?.social?.long) {
    copyText = marketing.social.long;
  }

  if (!copyText) {
    return NextResponse.json(
      { error: `No marketing copy found for "${slug}". Generate variants first.` },
      { status: 404 },
    );
  }

  const postUrl = `${SITE_URL}/blog/${slug}`;
  const textWithLink = copyText.includes(postUrl) ? copyText : `${copyText}\n\n${postUrl}`;

  try {
    const result = await createPost(textWithLink, postUrl, post.title, post.excerpt);

    const postRecord = {
      postedAt: new Date().toISOString(),
      postUri: result.uri,
      variant: 'bluesky',
    };

    // Store in new posted structure
    const updated = {
      ...marketing,
      posted: { ...marketing?.posted, bluesky: postRecord },
    };
    writeMarketing(slug, updated);

    return NextResponse.json({
      success: true,
      postUri: result.uri,
      platform: 'bluesky',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Bluesky post failed: ${message}` }, { status: 502 });
  }
}

/** Compose / schedule post from freeform text (admin social page). */
async function handleComposePost(body: ComposePostRequest) {
  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (body.platform !== 'bluesky') {
    return NextResponse.json({ error: 'Only bluesky platform is supported' }, { status: 400 });
  }

  const id = generateId();
  const variant = body.variant || 'custom';

  if (body.scheduledAt) {
    const scheduledDate = new Date(body.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
    }
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
    }

    addHistoryEntry({
      id,
      slug: body.slug || null,
      platform: body.platform,
      variant,
      text: body.text,
      linkUrl: body.linkUrl,
      status: 'scheduled',
      scheduledAt: scheduledDate.toISOString(),
    });

    return NextResponse.json({ id, status: 'scheduled', scheduledAt: scheduledDate.toISOString() });
  }

  try {
    const result = await postToBluesky(body.text, body.linkUrl);
    const postUrl = atUriToWebUrl(result.uri);

    addHistoryEntry({
      id,
      slug: body.slug || null,
      platform: body.platform,
      variant,
      text: body.text,
      linkUrl: body.linkUrl,
      status: 'posted',
      postedAt: new Date().toISOString(),
      postUri: result.uri,
      postUrl,
    });

    return NextResponse.json({ id, status: 'posted', postUri: result.uri, postUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    addHistoryEntry({
      id,
      slug: body.slug || null,
      platform: body.platform,
      variant,
      text: body.text,
      linkUrl: body.linkUrl,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failureReason: message,
    });

    return NextResponse.json({ error: message, id, status: 'failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof raw.text === 'string' ? raw.text : '';
  const slug = typeof raw.slug === 'string' ? raw.slug : undefined;
  const variant = raw.variant;

  // Schedule panel: { slug, platform, variant: short|long } — no compose text
  if (slug && !text.trim() && (variant === 'short' || variant === 'long')) {
    return handleMarketingPost({
      slug,
      platform: typeof raw.platform === 'string' ? raw.platform : '',
      variant,
    });
  }

  const body: ComposePostRequest = {
    text,
    platform: raw.platform as SocialPlatform,
    variant: raw.variant as PostVariant | undefined,
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    linkUrl: typeof raw.linkUrl === 'string' ? raw.linkUrl : undefined,
    scheduledAt: typeof raw.scheduledAt === 'string' ? raw.scheduledAt : undefined,
  };

  return handleComposePost(body);
}
