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

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  /** Groups posts into a serialized essay series; use with seriesPart for order. */
  series?: string;
  seriesTitle?: string;
  seriesPart?: number;
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

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'));

  const posts = files.map(filename => {
    const slug = filename.replace('.mdx', '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8');
    const { data, content } = matter(raw);

    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      excerpt: data.excerpt || content.slice(0, 200).replace(/[#*_\n]/g, ' ').trim() + '...',
      content,
      series: typeof data.series === 'string' ? data.series : undefined,
      seriesTitle: typeof data.seriesTitle === 'string' ? data.seriesTitle : undefined,
      seriesPart: parseSeriesPart(data.seriesPart),
    };
  });

  return posts
    .filter(p => p.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title || slug,
    date: data.date || '',
    excerpt: data.excerpt || '',
    content,
    series: typeof data.series === 'string' ? data.series : undefined,
    seriesTitle: typeof data.seriesTitle === 'string' ? data.seriesTitle : undefined,
    seriesPart: parseSeriesPart(data.seriesPart),
  };
}
