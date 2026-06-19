import { getPayload, type Payload } from 'payload';
import configPromise from '@payload-config';
import type { SerializedEditorState } from 'lexical';
import type { Group as PayloadGroup, Page as PayloadPage, Post } from '@/payload-types';
import { logger } from '@/lib/logger';
import { comparePostsByGroupOrder, latestPostDateMs } from '@/lib/post-order';
import { publicPostStatusWhere } from '@/lib/post-status';

export interface BlogPostMeta {
  title?: string;
  description?: string;
}

export interface BlogPost {
  id: number;
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
  /** Chapter slug within the group, matching a chapter defined on the group. */
  chapter?: string;
  /** Display author (Payload `posts.author`). */
  author?: string;
  /** Optional copy above the site footer subscribe on this post only. */
  newsletterHeading?: string;
  newsletterDescription?: string;
  /** SEO meta overrides — used by generateMetadata for OG/Twitter tags. */
  meta?: BlogPostMeta;
}

export interface Chapter {
  title: string;
  slug: string;
}

export interface Group {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  chapters?: Chapter[];
  posts: BlogPost[];
  meta?: BlogPostMeta;
}

type BlogPayload = Pick<Payload, 'find'>;

function toPost(doc: Post): BlogPost {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    date: doc.publishedDate,
    excerpt: doc.excerpt,
    content: doc.content as SerializedEditorState,
    group: doc.group || undefined,
    order: doc.order ?? undefined,
    chapter: doc.chapter || undefined,
    author: doc.author || undefined,
    newsletterHeading: doc.newsletterHeading || undefined,
    newsletterDescription: doc.newsletterDescription || undefined,
    meta: doc.meta
      ? {
          title: doc.meta.title || undefined,
          description: doc.meta.description || undefined,
        }
      : undefined,
  };
}

function toGroup(doc: PayloadGroup, posts: BlogPost[]): Group {
  const groupMeta = doc.meta;
  return {
    slug: doc.slug,
    title: doc.title,
    description: doc.description || undefined,
    tags: Array.isArray(doc.tags) ? doc.tags.map((t) => t.tag) : [],
    chapters: Array.isArray(doc.chapters)
      ? doc.chapters.map((c) => ({ title: c.title, slug: c.slug }))
      : undefined,
    posts,
    meta: groupMeta
      ? {
          title: groupMeta.title || undefined,
          description: groupMeta.description || undefined,
        }
      : undefined,
  };
}

async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: { publish_status: publicPostStatusWhere() },
    sort: '-publishedDate',
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}

/**
 * Published posts only, for RSS and syndication.
 */
export async function getPublishedPostsForRss(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      publish_status: publicPostStatusWhere(),
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
      and: [
        { slug: { equals: slug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    limit: 1,
    depth: 1,
  });

  if (result.docs.length === 0) return null;
  return toPost(result.docs[0]);
}

export async function getPostsBySlugs(slugs: string[]): Promise<BlogPost[]> {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (uniqueSlugs.length === 0) return [];

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { slug: { in: uniqueSlugs } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    limit: uniqueSlugs.length,
    depth: 0,
  });

  const postsBySlug = new Map(result.docs.map(doc => {
    const post = toPost(doc);
    return [post.slug, post] as const;
  }));

  return uniqueSlugs
    .map(slug => postsBySlug.get(slug))
    .filter((post): post is BlogPost => Boolean(post));
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
        and: [
          { group: { equals: g.slug } },
          { publish_status: publicPostStatusWhere() },
        ],
      },
      sort: ['order', 'publishedDate'],
      limit: 100,
      depth: 1,
    });

    if (postResult.docs.length === 0) continue;

    const posts = postResult.docs.map(toPost);
    posts.sort(comparePostsByGroupOrder);

    groups.push(toGroup(g, posts));
  }

  // Sort groups by most recent post date (newest first)
  return groups.sort((a, b) => {
    return latestPostDateMs(b.posts) - latestPostDateMs(a.posts);
  });
}

export async function loadGroupBySlug(payload: BlogPayload, slug: string): Promise<Group | null> {
  const groupResult = await payload.find({
    collection: 'groups',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const group = groupResult.docs[0];
  if (!group) return null;

  const postResult = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { equals: group.slug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    sort: ['order', 'publishedDate'],
    limit: 100,
    depth: 1,
  });

  const posts = postResult.docs.map(toPost);
  posts.sort(comparePostsByGroupOrder);

  return toGroup(group, posts);
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  try {
    return await loadGroupBySlug(await getPayloadClient(), slug);
  } catch (error) {
    logger.error({ err: error, slug }, '[getGroupBySlug] failed to load group');
    return null;
  }
}

export { partNum, buildPostUrl, buildGroupIntroUrl } from './post-url';

export type PostLocation = {
  groupSlug: string;
  groupTitle: string;
  /** 1-based position within the group (intro is 0). Kept for part labels
   * and prev/next nav; the URL itself uses the post slug, not this index. */
  partIndex: number;
};

/**
 * Map post slug → { groupSlug, groupTitle, partIndex } across every group.
 * Posts without a group are absent from the map.
 */
export async function buildPostUrlMap(): Promise<Map<string, PostLocation>> {
  const groups = await getAllGroups();
  const map = new Map<string, PostLocation>();
  for (const g of groups) {
    g.posts.forEach((post, i) => {
      map.set(post.slug, { groupSlug: g.slug, groupTitle: g.title, partIndex: i + 1 });
    });
  }
  return map;
}

export interface Page {
  slug: string;
  title: string;
  excerpt?: string;
  intro_label?: string;
  intro?: PayloadPage['intro'];
  content: PayloadPage['content'];
  outro?: PayloadPage['outro'];
  byline?: string;
  footer_text?: string;
  footer_link_label?: string;
  footer_link_href?: string;
  meta?: {
    title?: string;
    description?: string;
  };
}

function toPage(doc: PayloadPage): Page {
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt || undefined,
    intro_label: doc.intro_label || undefined,
    intro: doc.intro || undefined,
    content: doc.content,
    outro: doc.outro || undefined,
    byline: doc.byline || undefined,
    footer_text: doc.footer_text || undefined,
    footer_link_label: doc.footer_link_label || undefined,
    footer_link_href: doc.footer_link_href || undefined,
    meta: doc.meta
      ? {
          title: doc.meta.title || undefined,
          description: doc.meta.description || undefined,
        }
      : undefined,
  };
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 1,
    depth: 0,
  });

  if (result.docs.length === 0) return null;
  return toPage(result.docs[0]);
}

export async function getAllPages(): Promise<Page[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPage);
}

export async function getUngroupedPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { publish_status: publicPostStatusWhere() },
        {
          or: [
            { group: { equals: '' } },
            { group: { exists: false } },
          ],
        },
      ],
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}
