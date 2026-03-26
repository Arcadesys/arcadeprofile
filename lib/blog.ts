import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { readSchedule, writeSchedule } from './schedule';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

/** Returns the set of slugs that should NOT be shown on the site.
 *  A post is visible if its status is 'published' OR if its status is
 *  'scheduled' and its scheduledDate is today or in the past (using the
 *  configured timezone). */
function getDraftSlugs(): Set<string> {
  try {
    const schedule = readSchedule();
    const tz = schedule.settings?.timezone || 'America/Chicago';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

    // Auto-promote scheduled posts whose date has arrived,
    // and demote published posts whose date is in the future
    let dirty = false;
    for (const p of schedule.posts) {
      if (p.status === 'scheduled' && p.scheduledDate && p.scheduledDate <= todayStr) {
        p.status = 'published';
        dirty = true;
      } else if (p.status === 'published' && p.scheduledDate && p.scheduledDate > todayStr) {
        p.status = 'scheduled';
        dirty = true;
      }
    }
    if (dirty) {
      writeSchedule(schedule);
    }

    return new Set(
      schedule.posts
        .filter(p => p.status !== 'published')
        .map(p => p.slug)
    );
  } catch {
    return new Set();
  }
}

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
  tags: string[];
  posts: BlogPost[];
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

  const drafts = getDraftSlugs();
  return posts
    .filter(p => p.date && !drafts.has(p.slug))
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
function readGroupMeta(groupDir: string, slug: string): { title: string; description?: string; tags: string[] } {
  const metaPath = path.join(groupDir, '_group.json');
  if (fs.existsSync(metaPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return {
        title: typeof raw.title === 'string' ? raw.title : slugToTitle(slug),
        description: typeof raw.description === 'string' ? raw.description : undefined,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
      };
    } catch { /* fall through */ }
  }
  return { title: slugToTitle(slug), tags: [] };
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getAllGroups(): Group[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const drafts = getDraftSlugs();
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
        const post = parsePost(slug, data, content, entry.name);
        if (!drafts.has(slug)) {
          posts.push(post);
        }
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
      groups.push({ slug: entry.name, title: meta.title, description: meta.description, tags: meta.tags, posts });
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

  const drafts = getDraftSlugs();
  return posts
    .filter(p => p.date && !drafts.has(p.slug))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Returns the absolute file path and group (if any) for a blog post slug. */
export function getPostFilePath(slug: string): { filePath: string; group?: string } | null {
  const topLevel = path.join(BLOG_DIR, `${slug}.mdx`);
  if (fs.existsSync(topLevel)) {
    return { filePath: topLevel };
  }

  if (!fs.existsSync(BLOG_DIR)) return null;
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const filePath = path.join(BLOG_DIR, entry.name, `${slug}.mdx`);
      if (fs.existsSync(filePath)) {
        return { filePath, group: entry.name };
      }
    }
  }

  return null;
}

export function getPostBySlug(slug: string): BlogPost | null {
  if (getDraftSlugs().has(slug)) return null;

  const found = getPostFilePath(slug);
  if (!found) return null;

  const raw = fs.readFileSync(found.filePath, 'utf8');
  const { data, content } = matter(raw);
  return parsePost(slug, data, content, found.group);
}
