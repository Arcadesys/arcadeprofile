import type { Payload } from 'payload';

import type { Post } from '@/payload-types';

export interface QueueIds {
  fictionIds: string[];
  essaysIds: string[];
}

export function extractQueueIds(queue: unknown): string[] {
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

export async function loadPostsById(payload: Payload, ids: string[]): Promise<Map<string, Post>> {
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

// Read the publish-queue global and filter out any ids that are already
// promoted (published/sent) — those are no longer "live" queue members.
// Returns the queue ids the cron and hopper view should both treat as the
// source of truth for upcoming slots.
export async function loadLiveQueueIds(payload: Payload): Promise<QueueIds & { posts: Map<string, Post> }> {
  const queue = await payload.findGlobal({ slug: 'publish-queue', depth: 0 });
  const fictionIdsRaw = extractQueueIds((queue as { fictionQueue?: unknown }).fictionQueue);
  const essaysIdsRaw = extractQueueIds((queue as { essaysQueue?: unknown }).essaysQueue);

  const posts = await loadPostsById(payload, [...new Set([...fictionIdsRaw, ...essaysIdsRaw])]);

  const isLive = (p: Post | undefined): p is Post =>
    !!p && (p.publish_status === 'draft' || p.publish_status === 'scheduled');

  const fictionIds = fictionIdsRaw.filter((id) => isLive(posts.get(id)));
  const essaysIds = essaysIdsRaw.filter((id) => isLive(posts.get(id)));

  return { fictionIds, essaysIds, posts };
}
