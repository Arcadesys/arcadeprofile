import { NextResponse } from 'next/server';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { getPostLocationBySlug } from '@/lib/post-url';
import type { Post } from '@/payload-types';

const DEFAULT_SITE_URL = 'https://thearcades.me';

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

type Reason = 'draft' | 'no-group' | 'no-slug' | 'not-found';

interface ShareUrlResponse {
  url: string | null;
  absoluteUrl: string | null;
  reason?: Reason;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;
  const { id } = await params;

  let post: Post | null;
  try {
    post = (await payload.findByID({
      collection: 'posts',
      id,
      depth: 0,
      overrideAccess: true,
    })) as Post;
  } catch {
    return NextResponse.json<ShareUrlResponse>(
      { url: null, absoluteUrl: null, reason: 'not-found' },
      { status: 200 },
    );
  }

  if (post.publish_status !== 'published' && post.publish_status !== 'sent') {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'draft',
    });
  }

  const slug = post.slug;
  if (!slug) {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'no-slug',
    });
  }

  if (!post.group) {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'no-group',
    });
  }

  const location = await getPostLocationBySlug(payload, slug);
  if (!location) {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'not-found',
    });
  }

  return NextResponse.json<ShareUrlResponse>({
    url: location.url,
    absoluteUrl: `${siteUrl()}${location.url}`,
  });
}
