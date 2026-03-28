import { NextRequest, NextResponse } from 'next/server';
import { createPost, postToBluesky, atUriToWebUrl } from '@/lib/bluesky';
import {
  addHistoryEntry,
  generateId,
  SocialPlatform,
  PostVariant,
} from '@/lib/social';

interface ComposePostRequest {
  text: string;
  platform: SocialPlatform;
  variant?: PostVariant;
  slug?: string;
  linkUrl?: string;
  scheduledAt?: string;
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

  const body: ComposePostRequest = {
    text: typeof raw.text === 'string' ? raw.text : '',
    platform: raw.platform as SocialPlatform,
    variant: raw.variant as PostVariant | undefined,
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    linkUrl: typeof raw.linkUrl === 'string' ? raw.linkUrl : undefined,
    scheduledAt: typeof raw.scheduledAt === 'string' ? raw.scheduledAt : undefined,
  };

  return handleComposePost(body);
}
