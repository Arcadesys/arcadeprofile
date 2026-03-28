import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

export interface MdxPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  group: string;
  order?: number;
}

export interface MdxGroup {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  posts: MdxPost[];
}

function readGroupMeta(groupDir: string): { title: string; description?: string; tags: string[] } {
  const metaPath = path.join(groupDir, '_group.json');
  if (fs.existsSync(metaPath)) {
    const raw = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return {
      title: raw.title ?? path.basename(groupDir),
      description: raw.description,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    };
  }
  // Fallback: derive title from folder name
  const name = path.basename(groupDir);
  return {
    title: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    tags: [],
  };
}

function parseMdxFile(filePath: string, groupSlug: string): MdxPost | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  if (!data.title) return null;

  const slug = path.basename(filePath, path.extname(filePath));
  return {
    slug,
    title: data.title,
    date: data.date ?? '',
    excerpt: data.excerpt ?? '',
    content,
    group: groupSlug,
    order: typeof data.order === 'number' ? data.order : undefined,
  };
}

export function getAllGroups(): MdxGroup[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const groups: MdxGroup[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const groupDir = path.join(CONTENT_DIR, entry.name);
    const meta = readGroupMeta(groupDir);

    const files = fs.readdirSync(groupDir).filter(
      f => f.endsWith('.mdx') || f.endsWith('.md'),
    );

    const posts: MdxPost[] = [];
    for (const file of files) {
      const post = parseMdxFile(path.join(groupDir, file), entry.name);
      if (post) posts.push(post);
    }

    if (posts.length === 0) continue;

    // Sort: explicit order first, then by date
    posts.sort((a, b) => {
      const ao = a.order ?? Infinity;
      const bo = b.order ?? Infinity;
      if (ao !== bo) return ao - bo;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    groups.push({
      slug: entry.name,
      ...meta,
      posts,
    });
  }

  // Sort groups by most recent post date
  return groups.sort((a, b) => {
    const lastA = a.posts[a.posts.length - 1]?.date ?? '';
    const lastB = b.posts[b.posts.length - 1]?.date ?? '';
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });
}

export function getGroupBySlug(slug: string): MdxGroup | null {
  return getAllGroups().find(g => g.slug === slug) ?? null;
}

export function getAllPosts(): MdxPost[] {
  const groups = getAllGroups();
  const posts = groups.flatMap(g => g.posts);
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): MdxPost | null {
  return getAllPosts().find(p => p.slug === slug) ?? null;
}
