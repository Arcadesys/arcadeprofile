import { NextResponse } from 'next/server';
import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';
import { requirePayloadUser } from '@/lib/payloadSessionAuth';

interface ChapterSummary {
  slug: string;
  title: string;
}

interface SceneSummary {
  id: string;
  slug: string | null;
  title: string;
  publish_status: Post['publish_status'];
  order: number | null;
  chapter: string | null;
}

interface GroupListItem {
  slug: string;
  title: string;
  sceneCount: number;
  chapterCount: number;
}

interface GroupScenesResponse {
  group: {
    slug: string;
    title: string;
    format: Group['format'];
  };
  chapters: ChapterSummary[];
  columns: { chapterSlug: string | null; postIds: string[] }[];
  scenes: Record<string, SceneSummary>;
}

interface GroupsListResponse {
  groups: GroupListItem[];
}

const UNASSIGNED: null = null;

function chapterSummaries(group: Group): ChapterSummary[] {
  const raw = Array.isArray(group.chapters) ? group.chapters : [];
  return raw
    .filter((c): c is { title: string; slug: string; id?: string | null } =>
      typeof c?.title === 'string' && typeof c?.slug === 'string',
    )
    .map((c) => ({ title: c.title, slug: c.slug }));
}

async function loadGroupBySlug(payload: Payload, slug: string): Promise<Group | null> {
  const res = await payload.find({
    collection: 'groups',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    pagination: false,
  });
  return (res.docs[0] as Group | undefined) ?? null;
}

async function loadGroupsList(payload: Payload): Promise<GroupListItem[]> {
  const groups = await payload.find({
    collection: 'groups',
    limit: 0,
    depth: 0,
    pagination: false,
    sort: 'title',
  });

  const items = await Promise.all(
    (groups.docs as Group[]).map(async (g): Promise<GroupListItem | null> => {
      if (!g.slug) return null;
      const count = await payload.count({
        collection: 'posts',
        where: { group: { equals: g.slug } },
      });
      return {
        slug: g.slug,
        title: g.title ?? g.slug,
        sceneCount: count.totalDocs,
        chapterCount: chapterSummaries(g).length,
      };
    }),
  );
  return items.filter((item): item is GroupListItem => item !== null);
}

function sceneSummary(post: Post): SceneSummary {
  const id = String(post.id);
  return {
    id,
    slug: post.slug ?? null,
    title: post.title ?? post.slug ?? `Post ${id}`,
    publish_status: post.publish_status ?? 'draft',
    order: typeof post.order === 'number' ? post.order : null,
    chapter: post.chapter ?? null,
  };
}

async function buildGroupResponse(
  payload: Payload,
  group: Group,
): Promise<GroupScenesResponse> {
  const chapters = chapterSummaries(group);
  const chapterSlugs = new Set(chapters.map((c) => c.slug));

  const postsRes = await payload.find({
    collection: 'posts',
    where: { group: { equals: group.slug } },
    limit: 0,
    depth: 0,
    pagination: false,
    sort: 'order',
  });
  const posts = postsRes.docs as Post[];

  // Bucket posts by chapter. Unknown chapter slugs fall into Unassigned so
  // editors can re-place orphans rather than silently lose them.
  const buckets = new Map<string | null, Post[]>();
  buckets.set(UNASSIGNED, []);
  for (const c of chapters) buckets.set(c.slug, []);
  for (const p of posts) {
    const key = p.chapter && chapterSlugs.has(p.chapter) ? p.chapter : UNASSIGNED;
    const arr = buckets.get(key);
    if (arr) arr.push(p);
  }
  for (const [key, arr] of buckets) {
    arr.sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
      const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });
    buckets.set(key, arr);
  }

  const columns: { chapterSlug: string | null; postIds: string[] }[] = [];
  for (const c of chapters) {
    columns.push({
      chapterSlug: c.slug,
      postIds: (buckets.get(c.slug) ?? []).map((p) => String(p.id)),
    });
  }
  columns.push({
    chapterSlug: null,
    postIds: (buckets.get(UNASSIGNED) ?? []).map((p) => String(p.id)),
  });

  const scenes: Record<string, SceneSummary> = {};
  for (const p of posts) scenes[String(p.id)] = sceneSummary(p);

  return {
    group: { slug: group.slug, title: group.title, format: group.format ?? null },
    chapters,
    columns,
    scenes,
  };
}

export async function GET(request: Request) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;

  const url = new URL(request.url);
  const slug = url.searchParams.get('group');

  if (!slug) {
    const body: GroupsListResponse = { groups: await loadGroupsList(payload) };
    return NextResponse.json(body);
  }

  const group = await loadGroupBySlug(payload, slug);
  if (!group) {
    return NextResponse.json({ error: `Unknown group: ${slug}` }, { status: 404 });
  }
  const body = await buildGroupResponse(payload, group);
  return NextResponse.json(body);
}

interface PostColumnInput {
  chapterSlug: string | null;
  postIds: string[];
}

interface PostBody {
  group?: unknown;
  columns?: unknown;
}

function parseColumns(
  value: unknown,
  validChapterSlugs: Set<string>,
): { ok: true; columns: PostColumnInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'columns must be an array' };
  const columns: PostColumnInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'each column must be an object' };
    }
    const rawSlug = (entry as { chapterSlug?: unknown }).chapterSlug;
    let chapterSlug: string | null;
    if (rawSlug === null || rawSlug === undefined) {
      chapterSlug = null;
    } else if (typeof rawSlug === 'string') {
      if (!validChapterSlugs.has(rawSlug)) {
        return { ok: false, error: `Unknown chapterSlug: ${rawSlug}` };
      }
      chapterSlug = rawSlug;
    } else {
      return { ok: false, error: 'chapterSlug must be a string or null' };
    }
    const rawIds = (entry as { postIds?: unknown }).postIds;
    if (!Array.isArray(rawIds)) {
      return { ok: false, error: 'postIds must be an array' };
    }
    const ids: string[] = [];
    for (const id of rawIds) {
      if (typeof id !== 'string' && typeof id !== 'number') {
        return { ok: false, error: 'postIds entries must be strings or numbers' };
      }
      ids.push(String(id));
    }
    columns.push({ chapterSlug, postIds: ids });
  }
  return { ok: true, columns };
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

  if (typeof body.group !== 'string' || !body.group) {
    return NextResponse.json({ error: 'group is required' }, { status: 400 });
  }
  const group = await loadGroupBySlug(payload, body.group);
  if (!group) {
    return NextResponse.json({ error: `Unknown group: ${body.group}` }, { status: 404 });
  }

  const validChapterSlugs = new Set(chapterSummaries(group).map((c) => c.slug));
  const parsed = parseColumns(body.columns, validChapterSlugs);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Validate every id belongs to this group and appears exactly once across
  // all columns. Anything else means the UI is out of sync with the DB and we
  // shouldn't half-apply the move.
  const seen = new Set<string>();
  for (const col of parsed.columns) {
    for (const id of col.postIds) {
      if (seen.has(id)) {
        return NextResponse.json({ error: `Duplicate post id: ${id}` }, { status: 400 });
      }
      seen.add(id);
    }
  }

  const postsInGroup = await payload.find({
    collection: 'posts',
    where: { group: { equals: group.slug } },
    limit: 0,
    depth: 0,
    pagination: false,
  });
  const validIds = new Set((postsInGroup.docs as Post[]).map((p) => String(p.id)));
  for (const id of seen) {
    if (!validIds.has(id)) {
      return NextResponse.json(
        { error: `Post ${id} does not belong to group ${group.slug}` },
        { status: 400 },
      );
    }
  }

  // For each column, write order = index and chapter = chapterSlug. Skip writes
  // where the current value already matches to avoid spurious afterChange runs
  // (newsletter fan-out, revalidation).
  const existingById = new Map<string, Post>();
  for (const p of postsInGroup.docs as Post[]) {
    existingById.set(String(p.id), p);
  }

  await Promise.all(
    parsed.columns.flatMap((col) =>
      col.postIds.map(async (id, idx) => {
        const current = existingById.get(id);
        if (!current) return;
        const nextChapter = col.chapterSlug;
        const chapterChanged = (current.chapter ?? null) !== nextChapter;
        const orderChanged = current.order !== idx;
        if (!chapterChanged && !orderChanged) return;
        await payload.update({
          collection: 'posts',
          id: Number(id),
          data: {
            chapter: nextChapter,
            order: idx,
          },
          context: { skipNewsletter: true },
        });
      }),
    ),
  );

  const fresh = await loadGroupBySlug(payload, group.slug);
  if (!fresh) {
    return NextResponse.json({ error: 'Group disappeared during save' }, { status: 500 });
  }
  const out = await buildGroupResponse(payload, fresh);
  return NextResponse.json(out);
}
