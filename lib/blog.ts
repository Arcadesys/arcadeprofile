import { getPayload, type Payload } from 'payload';
import configPromise from '@payload-config';
import type { SerializedEditorState } from 'lexical';
import type { Group as PayloadGroup, Page as PayloadPage, Post } from '@/payload-types';
import { logger } from '@/lib/logger';
import { comparePostsByGroupOrder, latestPostDateMs } from '@/lib/post-order';
import { publicPostStatusWhere } from '@/lib/post-status';
import {
  loadMarkdownGroups,
  loadMarkdownPosts,
  selectPublicMarkdownPosts,
  type LoadMarkdownPostsOptions,
  type MarkdownGroup,
  type MarkdownPost,
} from '@/lib/markdown-posts';

export interface BlogPostMeta {
  title?: string;
  description?: string;
}

export interface BlogPost {
  id: number | string;
  slug: string;
  title: string;
  date: string;
  updatedDate?: string;
  excerpt: string;
  /** Lexical rich text JSON — render with <RichText /> */
  content?: SerializedEditorState;
  /** Repository-owned Markdown body when BLOG_SOURCE=markdown. */
  markdownBody?: string;
  hero?: { src: string; alt: string };
  /** Group/series slug (e.g. "the-singularity-log"). */
  group?: string;
  /** Explicit ordering within a group (lower numbers first). */
  order?: number;
  /** Chapter slug within the group, matching a chapter defined on the group. */
  chapter?: string;
  /** Display author (Payload `posts.author`). */
  author?: string;
  /** Freeform tags (Payload `posts.tags`), used for related-post matching. */
  tags: string[];
  /** Optional copy above the site footer subscribe on this post only. */
  newsletterHeading?: string;
  newsletterDescription?: string;
  /** SEO meta overrides — used by generateMetadata for OG/Twitter tags. */
  meta?: BlogPostMeta;
  /** Curated PDF edition; generated edition is used when absent. */
  pdfOverrideUrl?: string;
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

export type BlogSource = 'payload' | 'markdown';

export function getBlogSource(value = process.env.BLOG_SOURCE): BlogSource {
  const normalized = value?.trim().toLowerCase() || 'markdown';
  if (normalized !== 'payload' && normalized !== 'markdown') {
    throw new Error(`BLOG_SOURCE must be payload or markdown; received ${JSON.stringify(value)}.`);
  }
  return normalized;
}

function markdownPostToBlogPost(post: MarkdownPost): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    date: post.publishDate,
    updatedDate: post.updatedDate,
    excerpt: post.excerpt ?? '',
    markdownBody: post.body,
    hero: post.hero,
    group: post.group,
    order: post.order,
    tags: post.tags ?? [],
    meta: post.seo,
    pdfOverrideUrl: post.pdf?.overrideUrl,
  };
}

function markdownGroupToGroup(group: MarkdownGroup, posts: BlogPost[]): Group {
  return {
    slug: group.slug,
    title: group.title,
    description: group.description,
    tags: group.tags ?? [],
    chapters: group.chapters,
    posts,
    meta: group.meta,
  };
}

export function loadMarkdownBlog(
  options: LoadMarkdownPostsOptions & { now?: Date } = {},
): { posts: BlogPost[]; groups: Group[] } {
  const publicPosts = selectPublicMarkdownPosts(loadMarkdownPosts(options), options.now);
  const manifestGroups = loadMarkdownGroups(options);
  const manifestBySlug = new Map(manifestGroups.map((group) => [group.slug, group]));
  for (const post of publicPosts) {
    if (!manifestBySlug.has(post.group)) {
      throw new Error(`Markdown post ${post.filePath} refers to missing group manifest ${post.group}.`);
    }
  }
  const posts = publicPosts.map(markdownPostToBlogPost);
  const groups = manifestGroups
    .map((group) => {
      const groupPosts = posts.filter((post) => post.group === group.slug);
      groupPosts.sort(comparePostsByGroupOrder);
      return markdownGroupToGroup(group, groupPosts);
    })
    .filter((group) => group.posts.length > 0)
    .sort((a, b) => latestPostDateMs(b.posts) - latestPostDateMs(a.posts));
  return { posts, groups };
}

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
    tags: Array.isArray(doc.tags) ? doc.tags.map((t) => t.tag) : [],
    newsletterHeading: doc.newsletterHeading || undefined,
    newsletterDescription: doc.newsletterDescription || undefined,
    meta: doc.meta
      ? {
          title: doc.meta.title || undefined,
          description: doc.meta.description || undefined,
        }
      : undefined,
    pdfOverrideUrl: typeof doc.pdfEdition === 'object' && doc.pdfEdition && 'url' in doc.pdfEdition
      ? String(doc.pdfEdition.url ?? '') || undefined
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
  if (getBlogSource() === 'markdown') {
    return loadMarkdownBlog().posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }
  const payload = await getPayloadClient();
  return loadAllPosts(payload);
}

export async function loadAllPosts(payload: BlogPayload): Promise<BlogPost[]> {
  const result = await payload.find({
    collection: 'posts',
    where: { publish_status: publicPostStatusWhere() },
    sort: '-publishedDate',
    depth: 0,
    pagination: false,
  });

  return result.docs.map(toPost);
}

/**
 * Published posts only, for RSS and syndication.
 */
export async function getPublishedPostsForRss(): Promise<BlogPost[]> {
  if (getBlogSource() === 'markdown') {
    return loadMarkdownBlog().posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 100);
  }
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      publish_status: publicPostStatusWhere(),
    },
    sort: '-publishedDate',
    // RSS intentionally exposes the latest batch, not the full archive.
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (getBlogSource() === 'markdown') {
    return loadMarkdownBlog().posts.find((post) => post.slug === slug) ?? null;
  }
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

  if (getBlogSource() === 'markdown') {
    const postsBySlug = new Map(loadMarkdownBlog().posts.map((post) => [post.slug, post]));
    return uniqueSlugs.map((slug) => postsBySlug.get(slug)).filter((post): post is BlogPost => Boolean(post));
  }

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
  if (getBlogSource() === 'markdown') return loadMarkdownBlog().groups;
  const payload = await getPayloadClient();

  const groupDocs = await payload.find({
    collection: 'groups',
    depth: 0,
    pagination: false,
  });

  const groups: Group[] = [];

  for (const g of groupDocs.docs) {
    const posts = await loadPublicPostsForGroup(payload, g.slug);
    if (posts.length === 0) continue;
    groups.push(toGroup(g, posts));
  }

  // Sort groups by most recent post date (newest first)
  return groups.sort((a, b) => {
    return latestPostDateMs(b.posts) - latestPostDateMs(a.posts);
  });
}

async function loadPublicPostsForGroup(
  payload: BlogPayload,
  groupSlug: string,
): Promise<BlogPost[]> {
  const postResult = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { equals: groupSlug } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    sort: ['order', 'publishedDate'],
    depth: 1,
    pagination: false,
  });

  const posts = postResult.docs.map(toPost);
  posts.sort(comparePostsByGroupOrder);
  return posts;
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

  const posts = await loadPublicPostsForGroup(payload, group.slug);
  return toGroup(group, posts);
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  if (getBlogSource() === 'markdown') {
    return loadMarkdownBlog().groups.find((group) => group.slug === slug) ?? null;
  }
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
  return loadAllPages(payload);
}

export async function loadAllPages(payload: BlogPayload): Promise<Page[]> {
  const result = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    depth: 0,
    pagination: false,
  });

  return result.docs.map(toPage);
}

export async function getUngroupedPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();
  return loadUngroupedPosts(payload);
}

export async function loadUngroupedPosts(payload: BlogPayload): Promise<BlogPost[]> {
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
    depth: 0,
    pagination: false,
  });

  return result.docs.map(toPost);
}
