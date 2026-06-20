import { NextResponse } from 'next/server';
import type { Post } from '@/payload-types';

import { parseIsoDateOnly } from '@/lib/iso-date';
import { parseCalendarWindow } from '@/lib/calendar-window';
import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { draftOrMissingPostStatusClauses, publicPostStatusWhere } from '@/lib/post-status';

interface CalendarPost {
  id: string;
  title: string;
  slug: string | null;
  group: string | null;
  publish_status: Post['publish_status'];
  date: string; // YYYY-MM-DD — the day this post lives on in the grid
  draggable: boolean;
}

interface CalendarResponse {
  start: string;
  end: string;
  scheduled: CalendarPost[];
  drafts: CalendarPost[];
}

function toIsoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  if (parseIsoDateOnly(value)) return value;
  return value.slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;

  const url = new URL(request.url);
  const parsedWindow = parseCalendarWindow(
    url.searchParams.get('start'),
    url.searchParams.get('end'),
  );
  if (!parsedWindow.ok) {
    return NextResponse.json({ error: parsedWindow.error }, { status: 400 });
  }
  const { start, end, endExclusiveIso } = parsedWindow.window;

  const inRange = await payload.find({
    collection: 'posts',
    where: {
      or: [
        {
          and: [
            { publish_status: { equals: 'scheduled' } },
            { scheduledPublishDate: { greater_than_equal: start } },
            { scheduledPublishDate: { less_than: endExclusiveIso } },
          ],
        },
        {
          and: [
            { publish_status: publicPostStatusWhere() },
            { publishedDate: { greater_than_equal: start } },
            { publishedDate: { less_than: endExclusiveIso } },
          ],
        },
      ],
    },
    limit: 0,
    depth: 0,
    pagination: false,
  });

  const draftsRes = await payload.find({
    collection: 'posts',
    where: { or: draftOrMissingPostStatusClauses() },
    depth: 0,
    sort: '-updatedAt',
    pagination: false,
  });

  const scheduled: CalendarPost[] = (inRange.docs as Post[])
    .map((p): CalendarPost | null => {
      const status = p.publish_status ?? 'draft';
      const dateRaw =
        status === 'scheduled' ? p.scheduledPublishDate : p.publishedDate;
      const date = toIsoDay(dateRaw);
      if (!date) return null;
      return {
        id: String(p.id),
        title: p.title ?? p.slug ?? `Post ${p.id}`,
        slug: p.slug ?? null,
        group: p.group ?? null,
        publish_status: status,
        date,
        draggable: status === 'scheduled',
      };
    })
    .filter((p): p is CalendarPost => p !== null);

  const drafts: CalendarPost[] = (draftsRes.docs as Post[]).map((p) => ({
    id: String(p.id),
    title: p.title ?? p.slug ?? `Post ${p.id}`,
    slug: p.slug ?? null,
    group: p.group ?? null,
    publish_status: p.publish_status ?? 'draft',
    date: toIsoDay(p.scheduledPublishDate) ?? '',
    draggable: true,
  }));

  const body: CalendarResponse = { start, end, scheduled, drafts };
  return NextResponse.json(body);
}
