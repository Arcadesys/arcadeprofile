import { NextResponse } from 'next/server';
import type { Post } from '@/payload-types';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';

interface PostBody {
  postId?: unknown;
  date?: unknown;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.postId !== 'string' && typeof body.postId !== 'number') {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }
  const postId = String(body.postId);

  if (typeof body.date !== 'string' || !ISO_DATE.test(body.date)) {
    return NextResponse.json({ error: 'date must be a YYYY-MM-DD string' }, { status: 400 });
  }
  const date = body.date;

  let existing: Post;
  try {
    existing = (await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
    })) as Post;
  } catch {
    return NextResponse.json({ error: `Unknown post id: ${postId}` }, { status: 404 });
  }

  if (existing.publish_status === 'published' || existing.publish_status === 'sent') {
    return NextResponse.json(
      { error: `Post ${postId} is already ${existing.publish_status}` },
      { status: 400 },
    );
  }

  const updated = (await payload.update({
    collection: 'posts',
    id: postId,
    data: {
      publish_status: 'scheduled',
      scheduledPublishDate: date,
    },
  })) as Post;

  return NextResponse.json({
    id: String(updated.id),
    publish_status: updated.publish_status,
    scheduledPublishDate: updated.scheduledPublishDate,
  });
}
