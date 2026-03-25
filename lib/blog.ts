import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllStories, type StoryMeta } from './stories';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseOptionalInt(raw: unknown): number | undefined {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function optionalString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  /** Folder the post lives in under content/blog/ (e.g. "the-singularity-log"). */
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
  posts: BlogPost[];
}

export type FeedItem =
  | { type: 'post'; data: BlogPost }
  | { type: 'story'; data: StoryMeta };

export function getFeed(): FeedItem[] {
  const posts: FeedItem[] = getAllPosts().map(p => ({ type: 'post', data: p }));
  const stories: FeedItem[] = getAllStories().map(s => ({ type: 'story', data: s }));

  return [...posts, ...stories].sort((a, b) => {
    const dateA = a.type === 'post' ? a.data.date : a.data.latestChapterDate;
    const dateB = b.type === 'post' ? b.data.date : b.data.latestChapterDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const posts: BlogPost[] = [];

  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const slug = entry.name.replace('.mdx', '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, entry.name), 'utf8');
      const { data, content } = matter(raw);
      posts.push(parsePost(slug, data, content, undefined));
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const groupDir = path.join(BLOG_DIR, entry.name);
      for (const file of fs.readdirSync(groupDir)) {
        if (file.endsWith('.mdx')) {
          const slug = file.replace('.mdx', '');
          const raw = fs.readFileSync(path.join(groupDir, file), 'utf8');
          const { data, content } = matter(raw);
          posts.push(parsePost(slug, data, content, entry.name));
        }
      }
    }
  }

  return posts
    .filter(p => p.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function parsePost(slug: string, data: Record<string, unknown>, content: string, group: string | undefined): BlogPost {
  return {
    slug,
    title: (data.title as string) || slug,
    date: (data.date as string) || '',
    excerpt: (data.excerpt as string) || content.slice(0, 200).replace(/[#*_\n]/g, ' ').trim() + '...',
    content,
    group,
    order: parseOptionalInt(data.order),
    newsletterHeading: optionalString(data.newsletterHeading),
    newsletterDescription: optionalString(data.newsletterDescription),
  };
}

/** Read optional _group.json metadata from a group folder. */
function readGroupMeta(groupDir: string, slug: string): { title: string; description?: string } {
  const metaPath = path.join(groupDir, '_group.json');
  if (fs.existsSync(metaPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return {
        title: typeof raw.title === 'string' ? raw.title : slugToTitle(slug),
        description: typeof raw.description === 'string' ? raw.description : undefined,
      };
    } catch { /* fall through */ }
  }
  return { title: slugToTitle(slug) };
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getAllGroups(): Group[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const groups: Group[] = [];

  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const groupDir = path.join(BLOG_DIR, entry.name);
    const meta = readGroupMeta(groupDir, entry.name);
    const posts: BlogPost[] = [];

    for (const file of fs.readdirSync(groupDir)) {
      if (file.endsWith('.mdx')) {
        const slug = file.replace('.mdx', '');
        const raw = fs.readFileSync(path.join(groupDir, file), 'utf8');
        const { data, content } = matter(raw);
        posts.push(parsePost(slug, data, content, entry.name));
      }
    }

    // Sort by order (if present), then by date ascending
    posts.sort((a, b) => {
      const ao = a.order ?? Infinity;
      const bo = b.order ?? Infinity;
      if (ao !== bo) return ao - bo;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    if (posts.length > 0) {
      groups.push({ slug: entry.name, title: meta.title, description: meta.description, posts });
    }
  }

  // Sort groups by most recent post date (newest first)
  return groups.sort((a, b) => {
    const lastA = a.posts[a.posts.length - 1]?.date ?? '';
    const lastB = b.posts[b.posts.length - 1]?.date ?? '';
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });
}

export function getGroupBySlug(slug: string): Group | null {
  return getAllGroups().find(g => g.slug === slug) ?? null;
}

export function getUngroupedPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const posts: BlogPost[] = [];
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const slug = entry.name.replace('.mdx', '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, entry.name), 'utf8');
      const { data, content } = matter(raw);
      posts.push(parsePost(slug, data, content, undefined));
    }
  }

  return posts
    .filter(p => p.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  // Check top-level first
  const topLevel = path.join(BLOG_DIR, `${slug}.mdx`);
  if (fs.existsSync(topLevel)) {
    const raw = fs.readFileSync(topLevel, 'utf8');
    const { data, content } = matter(raw);
    return parsePost(slug, data, content, undefined);
  }

  // Search subdirectories
  if (!fs.existsSync(BLOG_DIR)) return null;
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const filePath = path.join(BLOG_DIR, entry.name, `${slug}.mdx`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(raw);
        return parsePost(slug, data, content, entry.name);
      }
    }
  }

  return null;
}
