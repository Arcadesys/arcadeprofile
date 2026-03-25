import { NextRequest, NextResponse } from 'next/server';
import { postToBluesky, atUriToWebUrl } from '@/lib/bluesky';
import {
  addHistoryEntry,
  generateId,
  SocialPlatform,
  PostVariant,
} from '@/lib/social';

interface PostRequest {
  text: string;
  platform: SocialPlatform;
  variant?: PostVariant;
  slug?: string; // optional blog post slug
  linkUrl?: string;
  scheduledAt?: string; // ISO datetime — if set, queues instead of posting
}

export async function POST(request: NextRequest) {
  const body: PostRequest = await request.json();

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (body.platform !== 'bluesky') {
    return NextResponse.json({ error: 'Only bluesky platform is supported' }, { status: 400 });
  }

  const id = generateId();
  const variant = body.variant || 'custom';

  // If scheduledAt is provided, queue instead of posting immediately
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

  // Post immediately
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
