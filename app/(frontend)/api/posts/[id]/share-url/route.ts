import { NextResponse } from 'next/server';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { buildPostUrl, computePostPartIndex } from '@/lib/post-url';
import type { ShareUrlResponse } from '@/lib/post-share-url-types';
import type { Post } from '@/payload-types';

const DEFAULT_SITE_URL = 'https://thearcades.me';

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
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

  const groupSlug = post.group;
  if (!groupSlug) {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'no-group',
    });
  }

  const partIndex = await computePostPartIndex(payload, slug, groupSlug);
  if (partIndex === null) {
    return NextResponse.json<ShareUrlResponse>({
      url: null,
      absoluteUrl: null,
      reason: 'not-found',
    });
  }

  const url = buildPostUrl(groupSlug, partIndex);
  return NextResponse.json<ShareUrlResponse>({
    url,
    absoluteUrl: `${siteUrl()}${url}`,
  });
}
