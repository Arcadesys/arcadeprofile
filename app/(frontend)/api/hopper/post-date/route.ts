import { NextResponse } from 'next/server';
import type { Group, Post } from '@/payload-types';

import { DEFAULT_PUBLISH_HOUR_UTC } from '@/lib/hopper/syncSchedule';
import { isIsoDateOnly, isoDateOnlyToScheduledIso } from '@/lib/iso-date';
import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { isPublicPostStatus } from '@/lib/post-status';
import { parsePositiveIntegerId } from '@/lib/positive-integer-id';
import { isChapterSerialSchedule, zonedDateTimeToUtc } from '@/lib/serial-schedule';
import { SITE_TZ } from '@/lib/site-time';

interface PostBody {
  postId?: unknown;
  date?: unknown;
}

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
  const postId = parsePositiveIntegerId(String(body.postId));
  if (postId === null) {
    return NextResponse.json({ error: 'postId must be a positive integer' }, { status: 400 });
  }

  if (!isIsoDateOnly(body.date)) {
    return NextResponse.json({ error: 'date must be a valid YYYY-MM-DD string' }, { status: 400 });
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

  let serialScheduledIso: string | null = null;
  if (existing.group) {
    const groups = await payload.find({
      collection: 'groups',
      where: { slug: { equals: existing.group } },
      limit: 1,
      depth: 0,
      pagination: false,
    });
    const group = groups.docs[0] as Group | undefined;
    const serialSchedule = group?.serialReleaseSchedule;
    if (serialSchedule && isChapterSerialSchedule(serialSchedule)) {
      if (new Date(`${date}T12:00:00.000Z`).getUTCDay() !== 1) {
        return NextResponse.json({ error: 'Chapter serial releases must stay on Monday.' }, { status: 400 });
      }
      serialScheduledIso = zonedDateTimeToUtc(date, serialSchedule.time ?? undefined, SITE_TZ);
      if (!serialScheduledIso) {
        return NextResponse.json({ error: 'This serial has an invalid Chicago-local release time.' }, { status: 400 });
      }
    }
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
  const scheduledIso = serialScheduledIso ?? isoDateOnlyToScheduledIso(date, hh, mm, ss, ms);
  if (!scheduledIso) {
    return NextResponse.json({ error: 'date must be a valid YYYY-MM-DD string' }, { status: 400 });
  }

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
