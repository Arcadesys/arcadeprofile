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
  /** Display author (Payload `posts.author`). */
  author?: string;
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

export interface GroupBlobImage {
  id: number;
  title: string;
  url: string;
  pathname?: string;
  alt: string;
  caption?: string;
  order: number;
  featured: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPost(doc: any): BlogPost {
  return {
    slug: doc.slug as string,
    title: doc.title as string,
    date: doc.publishedDate as string,
    excerpt: doc.excerpt as string,
    content: doc.content as SerializedEditorState,
    group: (doc.group as string) || undefined,
    order: doc.order as number | undefined,
    author: (doc.author as string) || undefined,
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
    sort: '-publishedDate',
    limit: 100,
    depth: 0,
  });

  return result.docs.map(toPost);
}

/**
 * Published posts only, for RSS and syndication (excludes drafts).
 */
export async function getPublishedPostsForRss(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'posts',
    where: {
      _status: { equals: 'published' },
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

export async function getBlobImagesByGroupSlug(slug: string): Promise<GroupBlobImage[]> {
  const payload = await getPayloadClient();

  const groupResult = await payload.find({
    collection: 'groups',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
    depth: 0,
  });

  const group = groupResult.docs[0];
  if (!group) return [];

  const imageResult = await payload.find({
    collection: 'blob-images',
    where: {
      group: { equals: group.id },
    },
    sort: 'order',
    limit: 200,
    depth: 0,
  });

  return imageResult.docs
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      pathname: doc.pathname || undefined,
      alt: doc.alt,
      caption: doc.caption || undefined,
      order: doc.order ?? 0,
      featured: !!doc.featured,
    }))
    .sort((a, b) => a.order - b.order);
}

export interface Page {
  slug: string;
  title: string;
  excerpt?: string;
  intro_label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intro?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outro?: any;
  byline?: string;
  footer_text?: string;
  footer_link_label?: string;
  footer_link_href?: string;
  meta?: {
    title?: string;
    description?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPage(doc: any): Page {
  return {
    slug: doc.slug as string,
    title: doc.title as string,
    excerpt: (doc.excerpt as string) || undefined,
    intro_label: (doc.intro_label as string) || undefined,
    intro: doc.intro || undefined,
    content: doc.content,
    outro: doc.outro || undefined,
    byline: (doc.byline as string) || undefined,
    footer_text: (doc.footer_text as string) || undefined,
    footer_link_label: (doc.footer_link_label as string) || undefined,
    footer_link_href: (doc.footer_link_href as string) || undefined,
    meta: doc.meta || undefined,
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
