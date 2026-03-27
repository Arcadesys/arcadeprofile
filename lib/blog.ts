import { getPayload } from 'payload';
import configPromise from '@payload-config';
import type { SerializedEditorState } from 'lexical';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  /** Lexical rich text JSON — render with <RichText /> */
  content: SerializedEditorState;
  /** Group/series slug (e.g. "the-singularity-log"). */
  group?: string;
  /** Explicit ordering within a group (lower numbers first). */
  order?: number;
  /** Optional copy above the site footer subscribe on this post only. */
  newsletterHeading?: string;
  newsletterDescription?: string;
}

export interface Group {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  posts: BlogPost[];
}

function toPost(doc: Record<string, unknown>): BlogPost {
  return {
    slug: doc.slug as string,
    title: doc.title as string,
    date: doc.publishedDate as string,
    excerpt: doc.excerpt as string,
    content: doc.content as SerializedEditorState,
    group: (doc.group as string) || undefined,
    order: doc.order as number | undefined,
    newsletterHeading: (doc.newsletterHeading as string) || undefined,
    newsletterDescription: (doc.newsletterDescription as string) || undefined,
  };
}

async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      status: { in: ['published', 'sent'] },
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
      status: { in: ['published', 'sent'] },
    },
    limit: 1,
    depth: 0,
  });

  if (result.docs.length === 0) return null;
  return toPost(result.docs[0]);
}

export async function getAllGroups(): Promise<Group[]> {
  const payload = await getPayloadClient();

  const groupDocs = await payload.find({
    collection: 'groups',
    limit: 100,
    depth: 0,
  });

  const groups: Group[] = [];

  for (const g of groupDocs.docs) {
    const postResult = await payload.find({
      collection: 'posts',
      where: {
        group: { equals: g.slug },
        status: { in: ['published', 'sent'] },
      },
      sort: 'order',
      limit: 100,
      depth: 0,
    });

    if (postResult.docs.length === 0) continue;

    const posts = postResult.docs.map(toPost);
    // Secondary sort: by date ascending for posts without explicit order
    posts.sort((a, b) => {
      const ao = a.order ?? Infinity;
      const bo = b.order ?? Infinity;
      if (ao !== bo) return ao - bo;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    groups.push({
      slug: g.slug as string,
      title: g.title as string,
      description: (g.description as string) || undefined,
      tags: Array.isArray(g.tags) ? g.tags.map((t: { tag: string }) => t.tag) : [],
      posts,
    });
  }

  // Sort groups by most recent post date (newest first)
  return groups.sort((a, b) => {
    const lastA = a.posts[a.posts.length - 1]?.date ?? '';
    const lastB = b.posts[b.posts.length - 1]?.date ?? '';
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  const groups = await getAllGroups();
  return groups.find((g) => g.slug === slug) ?? null;
}

export async function getUngroupedPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      status: { in: ['published', 'sent'] },
      or: [
        { group: { equals: '' } },
        { group: { exists: false } },
      ],
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}
