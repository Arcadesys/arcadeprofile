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
  /** Whether this post appears on /samples. */
  showInSamples?: boolean;
  /** Explicit ordering for /samples (lower numbers first). */
  sampleOrder?: number;
  /** Optional CTA label for /samples. */
  sampleLabel?: string;
}

export interface Group {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  posts: BlogPost[];
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
    showInSamples: Boolean(doc.showInSamples),
    sampleOrder: doc.sampleOrder as number | undefined,
    sampleLabel: (doc.sampleLabel as string) || undefined,
  };
}

async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

function isMissingPostSamplesColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as {
    cause?: { code?: string; message?: string };
    message?: string;
  };

  const hasMissingColumnCode = maybeError.cause?.code === '42703';
  const text = `${maybeError.message ?? ''} ${maybeError.cause?.message ?? ''}`;

  return hasMissingColumnCode && text.includes('show_in_samples');
}

const legacyPostSelect = {
  slug: true,
  title: true,
  publishedDate: true,
  excerpt: true,
  content: true,
  group: true,
  order: true,
  author: true,
  newsletterHeading: true,
  newsletterDescription: true,
} as const;

export async function getAllPosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  let result;
  try {
    result = await payload.find({
      collection: 'posts',
      sort: '-publishedDate',
      limit: 100,
      depth: 0,
    });
  } catch (error) {
    if (!isMissingPostSamplesColumnError(error)) {
      throw error;
    }

    console.warn(
      'posts.show_in_samples is missing in the database. Falling back to legacy post query. Run `npm run migrate` to apply latest schema changes.',
    );

    result = await payload.find({
      collection: 'posts',
      sort: '-publishedDate',
      limit: 100,
      depth: 0,
      select: legacyPostSelect,
    });
  }

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

export async function getPostsBySlugs(slugs: string[]): Promise<BlogPost[]> {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (uniqueSlugs.length === 0) return [];

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { in: uniqueSlugs },
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

export async function getSamplePosts(): Promise<BlogPost[]> {
  const payload = await getPayloadClient();

  let result;
  try {
    result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { showInSamples: { equals: true } },
          { _status: { equals: 'published' } },
        ],
      },
      sort: 'sampleOrder',
      limit: 100,
      depth: 0,
    });
  } catch (error) {
    if (!isMissingPostSamplesColumnError(error)) {
      throw error;
    }

    console.warn(
      'posts.show_in_samples is missing in the database. Returning no sample posts until migrations are applied (`npm run migrate`).',
    );
    return [];
  }

  return result.docs
    .map(toPost)
    .sort((a, b) => {
      const ao = a.sampleOrder ?? Infinity;
      const bo = b.sampleOrder ?? Infinity;
      if (ao !== bo) return ao - bo;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export async function getSamplePostBySlug(slug: string): Promise<BlogPost | null> {
  const payload = await getPayloadClient();

  let result;
  try {
    result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { slug: { equals: slug } },
          { showInSamples: { equals: true } },
          { _status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 0,
    });
  } catch (error) {
    if (!isMissingPostSamplesColumnError(error)) {
      throw error;
    }

    console.warn(
      'posts.show_in_samples is missing in the database. Sample post lookups are unavailable until migrations are applied (`npm run migrate`).',
    );
    return null;
  }

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
