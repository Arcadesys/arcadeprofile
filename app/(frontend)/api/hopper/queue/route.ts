import { NextResponse } from 'next/server';
import type { Payload } from 'payload';
import type { Group, Post, PublishQueue } from '@/payload-types';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { computeGroupAwareSchedule, syncQueueToPosts, todayInSiteTz } from '@/lib/hopper/syncSchedule';
import { loadPublishedToday } from '@/lib/hopper/publishedToday';
import { extractQueueIds, loadLiveQueueIds, loadPostsById } from '@/lib/hopper/loadQueue';
import { isPublicPostStatus, prePublicOrMissingPostStatusClauses } from '@/lib/post-status';
import { parsePositiveIntegerId } from '@/lib/positive-integer-id';
import { buildPreviewUrl } from '@/lib/preview-token';
import { isChapterSerialSchedule, type ChapterSerialSchedule } from '@/lib/serial-schedule';
import { buildPostUrl } from '@/lib/post-url';

type Lane = 'fiction' | 'essays';

interface PostSummary {
  id: string;
  slug: string | null;
  title: string;
  publish_status: Post['publish_status'];
  group: string | null;
  audience: Lane;
  scheduledPublishDate: string | null;
  computedPublishDate: string | null;
  weekdayLabel: string | null;
  preflight: string[];
  previewUrl: string | null;
  publishedUrl: string | null;
  deliveryStatus: string | null;
}

interface QueueResponse {
  fiction: PostSummary[];
  essays: PostSummary[];
  unqueued: PostSummary[];
  fictionShipped: PostSummary[];
  essaysShipped: PostSummary[];
  today: string;
}

function audienceFor(groupSlug: string | null | undefined, groupMap: Map<string, Group>): Lane {
  if (!groupSlug) return 'essays';
  const g = groupMap.get(groupSlug);
  return g?.category === 'fiction' ? 'fiction' : 'essays';
}

function serialSchedules(groupMap: Map<string, Group>): Map<string, ChapterSerialSchedule> {
  const schedules = new Map<string, ChapterSerialSchedule>();
  for (const [slug, group] of groupMap) {
    const schedule = (group as Group & { serialReleaseSchedule?: ChapterSerialSchedule }).serialReleaseSchedule;
    if (schedule && isChapterSerialSchedule(schedule)) schedules.set(slug, schedule);
  }
  return schedules;
}

function preflightFor(post: Post, groupMap: Map<string, Group>): string[] {
  const issues: string[] = [];
  const isChapterSerial = post.group && isChapterSerialSchedule(
    (groupMap.get(post.group) as (Group & { serialReleaseSchedule?: ChapterSerialSchedule }) | undefined)?.serialReleaseSchedule,
  );
  if (!isChapterSerial) return issues;
  if (!post.group) issues.push('Choose a serial group.');
  if (!post.title?.trim()) issues.push('Add a chapter title.');
  if (!post.excerpt?.trim()) issues.push('Add a chapter excerpt.');
  if (!post.content) issues.push('Add the complete chapter content.');
  if (typeof post.order !== 'number') issues.push('Set the chapter order.');
  if (!buildPreviewUrl(post.previewToken)) issues.push('Save once to create a preview link.');
  if (typeof post.suppressNewsletter !== 'boolean') issues.push('Choose whether this chapter sends a newsletter.');
  return issues;
}

async function loadGroupMap(payload: Payload): Promise<Map<string, Group>> {
  // pagination:false + limit:0 returns every group. Hopper only stores a slug→category
  // map, so the payload size is bounded by how many groups exist, not arbitrary.
  const groups = await payload.find({
    collection: 'groups',
    limit: 0,
    depth: 0,
    pagination: false,
  });
  const map = new Map<string, Group>();
  for (const g of groups.docs as Group[]) {
    if (g.slug) map.set(g.slug, g);
  }
  return map;
}

async function buildResponse(payload: Payload): Promise<QueueResponse> {
  const { fictionIds, essaysIds, posts: queuedPosts } = await loadLiveQueueIds(payload);

  const { posts: publishedToday, takenDates, todayIso } = await loadPublishedToday(payload);

  const unqueuedRes = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { or: prePublicOrMissingPostStatusClauses() },
        { id: { not_in: [...fictionIds, ...essaysIds] } },
      ],
    },
    depth: 0,
    sort: '-updatedAt',
    pagination: false,
  });

  const groupMap = await loadGroupMap(payload);
  const schedules = serialSchedules(groupMap);
  const schedule = computeGroupAwareSchedule(
    fictionIds.map((id) => ({ id, group: queuedPosts.get(id)?.group })),
    essaysIds.map((id) => ({ id, group: queuedPosts.get(id)?.group })),
    schedules,
    new Date(),
    undefined,
    takenDates,
  );

  const toSummary = (post: Post, lane: Lane | null): PostSummary => {
    const id = String(post.id);
    const slot = lane ? schedule.get(id) ?? null : null;
    return {
      id,
      slug: post.slug ?? null,
      title: post.title ?? post.slug ?? `Post ${id}`,
      publish_status: post.publish_status ?? 'draft',
      group: post.group ?? null,
      audience: audienceFor(post.group, groupMap),
      scheduledPublishDate: post.scheduledPublishDate ?? null,
      computedPublishDate: slot?.date ?? null,
      weekdayLabel: slot?.weekdayLabel ?? null,
      preflight: preflightFor(post, groupMap),
      previewUrl: buildPreviewUrl(post.previewToken),
      publishedUrl: post.group && post.slug ? buildPostUrl(post.group, post.slug) : null,
      deliveryStatus: post.newsletterSend?.status ?? null,
    };
  };

  const toShippedSummary = (post: Post, lane: Lane): PostSummary => {
    const id = String(post.id);
    const publishedIso =
      typeof post.publishedDate === 'string' ? todayInSiteTz(new Date(post.publishedDate)) : null;
    return {
      id,
      slug: post.slug ?? null,
      title: post.title ?? post.slug ?? `Post ${id}`,
      publish_status: post.publish_status ?? 'published',
      group: post.group ?? null,
      audience: lane,
      scheduledPublishDate: post.scheduledPublishDate ?? null,
      computedPublishDate: publishedIso,
      weekdayLabel: `Today · ${lane === 'fiction' ? 'Fiction' : 'Essays'}`,
      preflight: preflightFor(post, groupMap),
      previewUrl: buildPreviewUrl(post.previewToken),
      publishedUrl: post.group && post.slug ? buildPostUrl(post.group, post.slug) : null,
      deliveryStatus: post.newsletterSend?.status ?? null,
    };
  };

  const fictionShipped: PostSummary[] = [];
  const essaysShipped: PostSummary[] = [];
  for (const p of publishedToday) {
    const lane = audienceFor(p.group, groupMap);
    (lane === 'fiction' ? fictionShipped : essaysShipped).push(toShippedSummary(p, lane));
  }

  const fictionSummaries: PostSummary[] = fictionIds
    .map((id) => queuedPosts.get(id))
    .filter((p): p is Post => !!p)
    .map((p) => toSummary(p, 'fiction'));

  const essaysSummaries: PostSummary[] = essaysIds
    .map((id) => queuedPosts.get(id))
    .filter((p): p is Post => !!p)
    .map((p) => toSummary(p, 'essays'));

  const unqueuedSummaries: PostSummary[] = (unqueuedRes.docs as Post[]).map((p) => toSummary(p, null));

  return {
    fiction: fictionSummaries,
    essays: essaysSummaries,
    unqueued: unqueuedSummaries,
    fictionShipped,
    essaysShipped,
    today: todayIso,
  };
}

export async function GET(request: Request) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;
  const body = await buildResponse(payload);
  return NextResponse.json(body);
}

interface PostBody {
  fictionQueue?: unknown;
  essaysQueue?: unknown;
}

function parseIds(value: unknown, fieldName: string): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be an array` };
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' && typeof item !== 'number') {
      return { ok: false, error: `${fieldName} entries must be strings or numbers` };
    }
    const parsed = parsePositiveIntegerId(String(item));
    if (parsed === null) {
      return { ok: false, error: `${fieldName} entries must be positive integer post ids` };
    }
    ids.push(String(parsed));
  }
  return { ok: true, ids };
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

  const fictionParse = parseIds(body.fictionQueue, 'fictionQueue');
  if (!fictionParse.ok) return NextResponse.json({ error: fictionParse.error }, { status: 400 });
  const essaysParse = parseIds(body.essaysQueue, 'essaysQueue');
  if (!essaysParse.ok) return NextResponse.json({ error: essaysParse.error }, { status: 400 });

  const fictionIds = fictionParse.ids;
  const essaysIds = essaysParse.ids;

  const combined = [...fictionIds, ...essaysIds];
  const seen = new Set<string>();
  for (const id of combined) {
    if (seen.has(id)) {
      return NextResponse.json({ error: `Duplicate post id: ${id}` }, { status: 400 });
    }
    seen.add(id);
  }

  if (combined.length > 0) {
    const posts = await loadPostsById(payload, combined);
    const groupMap = await loadGroupMap(payload);
    for (const id of combined) {
      const post = posts.get(id);
      if (!post) {
        return NextResponse.json({ error: `Unknown post id: ${id}` }, { status: 400 });
      }
      if (isPublicPostStatus(post.publish_status)) {
        return NextResponse.json(
          { error: `Post ${id} is already ${post.publish_status} and cannot be queued` },
          { status: 400 },
        );
      }
      const issues = preflightFor(post, groupMap);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: `Post ${id} is not ready for its chapter release: ${issues.join(' ')}` },
          { status: 400 },
        );
      }
    }
  }

  const prevGlobal = await payload.findGlobal({ slug: 'publish-queue', depth: 0 });
  const prev = {
    fictionIds: extractQueueIds((prevGlobal as { fictionQueue?: unknown }).fictionQueue),
    essaysIds: extractQueueIds((prevGlobal as { essaysQueue?: unknown }).essaysQueue),
  };

  const data = {
    fictionQueue: fictionIds.map((id) => ({ post: Number(id) })),
    essaysQueue: essaysIds.map((id) => ({ post: Number(id) })),
  } satisfies Pick<PublishQueue, 'fictionQueue' | 'essaysQueue'>;

  await payload.updateGlobal({
    slug: 'publish-queue',
    data,
  });

  const { takenDates } = await loadPublishedToday(payload);
  const groupMap = await loadGroupMap(payload);
  await syncQueueToPosts(payload, prev, { fictionIds, essaysIds }, new Date(), takenDates, {
    serialSchedules: serialSchedules(groupMap),
  });

  const body2 = await buildResponse(payload);
  return NextResponse.json(body2);
}
