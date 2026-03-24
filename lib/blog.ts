import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getAllStories, type StoryMeta } from './stories';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseSeriesPart(raw: unknown): number | undefined {
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
  /** Groups posts into a serialized essay series; use with seriesPart for order. */
  series?: string;
  seriesTitle?: string;
  seriesPart?: number;
  /** Optional copy above the site footer subscribe on this post only. */
  newsletterHeading?: string;
  newsletterDescription?: string;
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

  // Read .mdx files from top-level directory
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const slug = entry.name.replace('.mdx', '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, entry.name), 'utf8');
      const { data, content } = matter(raw);
      posts.push(parsePost(slug, data, content, undefined));
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      // Read .mdx files from subdirectories (groups)
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
    series: typeof data.series === 'string' ? data.series : undefined,
    seriesTitle: typeof data.seriesTitle === 'string' ? data.seriesTitle : undefined,
    seriesPart: parseSeriesPart(data.seriesPart),
    newsletterHeading: optionalString(data.newsletterHeading),
    newsletterDescription: optionalString(data.newsletterDescription),
  };
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
