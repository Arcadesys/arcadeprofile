import { comparePostsByGroupOrder, latestPostDateMs } from '@/lib/post-order';
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
  markdownBody: string;
  hero?: { src: string; alt: string };
  group: string;
  order?: number;
  chapter?: string;
  author?: string;
  tags: string[];
  newsletterHeading?: string;
  newsletterDescription?: string;
  meta?: BlogPostMeta;
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

export async function getAllPosts(): Promise<BlogPost[]> {
  return loadMarkdownBlog().posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getPublishedPostsForRss(): Promise<BlogPost[]> {
  return (await getAllPosts()).slice(0, 100);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return loadMarkdownBlog().posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostsBySlugs(slugs: string[]): Promise<BlogPost[]> {
  const postsBySlug = new Map(loadMarkdownBlog().posts.map((post) => [post.slug, post]));
  return [...new Set(slugs.filter(Boolean))]
    .map((slug) => postsBySlug.get(slug))
    .filter((post): post is BlogPost => Boolean(post));
}

export async function getAllGroups(): Promise<Group[]> {
  return loadMarkdownBlog().groups;
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  return loadMarkdownBlog().groups.find((group) => group.slug === slug) ?? null;
}

export { partNum, buildPostUrl, buildGroupIntroUrl } from './post-url';

export type PostLocation = {
  groupSlug: string;
  groupTitle: string;
  partIndex: number;
};

export async function buildPostUrlMap(): Promise<Map<string, PostLocation>> {
  const groups = await getAllGroups();
  const map = new Map<string, PostLocation>();
  for (const group of groups) {
    group.posts.forEach((post, index) => {
      map.set(post.slug, {
        groupSlug: group.slug,
        groupTitle: group.title,
        partIndex: index + 1,
      });
    });
  }
  return map;
}
