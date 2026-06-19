import { NextResponse } from 'next/server';
import type { Post } from '@/payload-types';

import { DEFAULT_PUBLISH_HOUR_UTC } from '@/lib/hopper/syncSchedule';
import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { isPublicPostStatus } from '@/lib/post-status';

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

  if (isPublicPostStatus(existing.publish_status)) {
    return NextResponse.json(
      { error: `Post ${postId} is already ${existing.publish_status}` },
      { status: 400 },
    );
  }

  // Preserve the post's existing send time-of-day (UTC) so dragging only
  // changes the calendar day. Fall back to the queue default when the post has
  // no prior scheduledPublishDate (e.g. dragging from the drafts tray).
  const prior =
    typeof existing.scheduledPublishDate === 'string'
      ? new Date(existing.scheduledPublishDate)
      : null;
  const validPrior = prior && !Number.isNaN(prior.getTime()) ? prior : null;
  const hh = validPrior ? validPrior.getUTCHours() : DEFAULT_PUBLISH_HOUR_UTC;
  const mm = validPrior ? validPrior.getUTCMinutes() : 0;
  const ss = validPrior ? validPrior.getUTCSeconds() : 0;
  const ms = validPrior ? validPrior.getUTCMilliseconds() : 0;
  const [y, mo, d] = date.split('-').map((n) => Number(n));
  const scheduledIso = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss, ms)).toISOString();

  const updated = (await payload.update({
    collection: 'posts',
    id: postId,
    data: {
      publish_status: 'scheduled',
      scheduledPublishDate: scheduledIso,
    },
  })) as Post;

  return NextResponse.json({
    id: String(updated.id),
    publish_status: updated.publish_status,
    scheduledPublishDate: updated.scheduledPublishDate,
  });
}
