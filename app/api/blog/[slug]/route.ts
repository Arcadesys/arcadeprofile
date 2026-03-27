import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { getPostFilePath } from '@/lib/blog';
import { readSchedule, writeSchedule } from '@/lib/schedule';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const found = getPostFilePath(slug);
  if (!found) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const raw = fs.readFileSync(found.filePath, 'utf8');
  const { data, content } = matter(raw);

  return NextResponse.json({
    slug,
    group: found.group || null,
    frontmatter: {
      title: data.title || '',
      date: data.date || '',
      excerpt: data.excerpt || '',
      order: data.order ?? null,
      newsletterHeading: data.newsletterHeading || null,
      newsletterDescription: data.newsletterDescription || null,
    },
    body: content,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const found = getPostFilePath(slug);
  if (!found) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const body = await request.json();
  const { frontmatter, body: content } = body;

  if (!frontmatter || typeof content !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Build clean frontmatter object (omit null/undefined optional fields)
  const fm: Record<string, unknown> = {
    title: frontmatter.title,
    date: frontmatter.date,
    excerpt: frontmatter.excerpt,
  };
  if (frontmatter.order != null) fm.order = frontmatter.order;
  if (frontmatter.newsletterHeading) fm.newsletterHeading = frontmatter.newsletterHeading;
  if (frontmatter.newsletterDescription) fm.newsletterDescription = frontmatter.newsletterDescription;

  // Reconstruct and write the MDX file
  const fileContent = matter.stringify(content, fm);
  fs.writeFileSync(found.filePath, fileContent, 'utf8');

  // Sync date to schedule.json if present
  if (frontmatter.date) {
    try {
      const schedule = readSchedule();
      const post = schedule.posts.find(p => p.slug === slug);
      if (post) {
        post.scheduledDate = frontmatter.date;
        if (post.status === 'draft') post.status = 'scheduled';
        writeSchedule(schedule);
      }
    } catch {
      // Schedule sync is best-effort
    }
  }

  return NextResponse.json({ ok: true });
}
