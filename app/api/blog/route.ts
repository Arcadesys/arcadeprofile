import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { getPostFilePath } from '@/lib/blog';
import { readSchedule, writeSchedule } from '@/lib/schedule';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, group, frontmatter, body: content } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format (use lowercase-kebab-case)' }, { status: 400 });
  }

  // Check for duplicates
  if (getPostFilePath(slug)) {
    return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
  }

  const fm: Record<string, unknown> = {
    title: frontmatter?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    date: frontmatter?.date || '',
    excerpt: frontmatter?.excerpt || '',
  };

  const mdxContent = content || '';
  const fileContent = matter.stringify(mdxContent, fm);

  // Determine target directory
  let targetDir = BLOG_DIR;
  if (group) {
    targetDir = path.join(BLOG_DIR, group);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const filePath = path.join(targetDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, fileContent, 'utf8');

  // Add to schedule.json as draft
  try {
    const schedule = readSchedule();
    schedule.posts.push({
      slug,
      status: 'draft',
      scheduledDate: frontmatter?.date || null,
      tags: [],
    });
    writeSchedule(schedule);
  } catch {
    // Schedule sync is best-effort
  }

  return NextResponse.json({ ok: true, slug, group: group || null }, { status: 201 });
}
