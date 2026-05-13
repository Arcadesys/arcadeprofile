import { NextResponse } from 'next/server';
import type { Payload } from 'payload';
import type { Group, Post } from '@/payload-types';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { computeSchedule, syncQueueToPosts, todayInSiteTz } from '@/lib/hopper/syncSchedule';

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

function extractQueueIds(queue: unknown): string[] {
  if (!Array.isArray(queue)) return [];
  const ids: string[] = [];
  for (const entry of queue) {
    if (!entry || typeof entry !== 'object') continue;
    const post = (entry as { post?: unknown }).post;
    if (post == null) continue;
    if (typeof post === 'string' || typeof post === 'number') {
      ids.push(String(post));
    } else if (typeof post === 'object' && post !== null && 'id' in post) {
      ids.push(String((post as { id: string | number }).id));
    }
  }
  return ids;
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

async function loadPostsById(payload: Payload, ids: string[]): Promise<Map<string, Post>> {
  if (ids.length === 0) return new Map();
  const res = await payload.find({
    collection: 'posts',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
  });
  const map = new Map<string, Post>();
  for (const p of res.docs as Post[]) {
    map.set(String(p.id), p);
  }
  return map;
}

async function buildResponse(payload: Payload): Promise<QueueResponse> {
  const queue = await payload.findGlobal({ slug: 'publish-queue', depth: 0 });
  const fictionIdsRaw = extractQueueIds((queue as { fictionQueue?: unknown }).fictionQueue);
  const essaysIdsRaw = extractQueueIds((queue as { essaysQueue?: unknown }).essaysQueue);

  const queuedPosts = await loadPostsById(payload, [...new Set([...fictionIdsRaw, ...essaysIdsRaw])]);

  // Filter out anything that's been promoted away — `published` or `sent` — so the queue self-cleans.
  const isLive = (p: Post | undefined): p is Post =>
    !!p && (p.publish_status === 'draft' || p.publish_status === 'scheduled');

  const fictionIds = fictionIdsRaw.filter((id) => isLive(queuedPosts.get(id)));
  const essaysIds = essaysIdsRaw.filter((id) => isLive(queuedPosts.get(id)));

  const schedule = computeSchedule(fictionIds, essaysIds, new Date());

  const todayIso = todayInSiteTz();

  // Posts that already shipped today — surface them at the top of their lane so
  // the editor can see "today's fiction already went out" without us re-injecting
  // them into the writable queue.
  const publishedTodayRes = await payload.find({
    collection: 'posts',
    where: { publish_status: { in: ['published', 'sent'] } },
    limit: 50,
    depth: 0,
    sort: '-publishedDate',
    pagination: false,
  });
  const publishedToday = (publishedTodayRes.docs as Post[]).filter(
    (p) => typeof p.publishedDate === 'string' && p.publishedDate.slice(0, 10) === todayIso,
  );

  const unqueuedRes = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { publish_status: { in: ['draft', 'scheduled'] } },
        { id: { not_in: [...fictionIds, ...essaysIds] } },
      ],
    },
    limit: 200,
    depth: 0,
    sort: '-updatedAt',
    pagination: false,
  });

  const groupMap = await loadGroupMap(payload);

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
    };
  };

  const toShippedSummary = (post: Post, lane: Lane): PostSummary => {
    const id = String(post.id);
    const publishedIso =
      typeof post.publishedDate === 'string' ? post.publishedDate.slice(0, 10) : null;
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
    ids.push(String(item));
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
    for (const id of combined) {
      const post = posts.get(id);
      if (!post) {
        return NextResponse.json({ error: `Unknown post id: ${id}` }, { status: 400 });
      }
      if (post.publish_status === 'published' || post.publish_status === 'sent') {
        return NextResponse.json(
          { error: `Post ${id} is already ${post.publish_status} and cannot be queued` },
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

  await payload.updateGlobal({
    slug: 'publish-queue',
    data: {
      fictionQueue: fictionIds.map((id) => ({ post: Number(id) })),
      essaysQueue: essaysIds.map((id) => ({ post: Number(id) })),
    } as never,
  });

  await syncQueueToPosts(payload, prev, { fictionIds, essaysIds });

  const body2 = await buildResponse(payload);
  return NextResponse.json(body2);
}
