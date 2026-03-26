import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { getPostFilePath } from '@/lib/blog';
import { readSchedule, writeSchedule } from '@/lib/schedule';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const body = await request.json().catch(() => ({}));
  const { group, scheduledDate } = body as { group?: string; scheduledDate?: string };

  // Find existing post
  const found = getPostFilePath(slug);
  if (!found) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Read and validate current MDX content
  const raw = fs.readFileSync(found.filePath, 'utf8');
  const { data, content } = matter(raw);

  if (!data.title || !data.title.trim()) {
    return NextResponse.json({ error: 'Post must have a title before publishing' }, { status: 422 });
  }

  // Determine the publish date
  const tz = (() => {
    try { return readSchedule().settings?.timezone || 'America/Chicago'; } catch { return 'America/Chicago'; }
  })();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const publishDate = scheduledDate || data.date || todayStr;

  // Update frontmatter date if not already set
  if (!data.date) {
    data.date = publishDate;
  }

  // Handle group move if requested and different from current
  const currentGroup = found.group || null;
  const targetGroup = group !== undefined ? (group || null) : currentGroup;
  let targetPath = found.filePath;

  if (targetGroup !== currentGroup) {
    // Determine new file path
    if (targetGroup) {
      const targetDir = path.join(BLOG_DIR, targetGroup);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      targetPath = path.join(targetDir, `${slug}.mdx`);
    } else {
      targetPath = path.join(BLOG_DIR, `${slug}.mdx`);
    }

    // Check for collision at target
    if (targetPath !== found.filePath && fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'A file already exists at the target location' }, { status: 409 });
    }

    // Write to new location, then remove old file
    const updatedContent = matter.stringify(content, data);
    fs.writeFileSync(targetPath, updatedContent, 'utf8');
    if (targetPath !== found.filePath) {
      fs.unlinkSync(found.filePath);
    }
  } else if (!data.date || data.date !== publishDate) {
    // Rewrite file if date was updated
    data.date = publishDate;
    const updatedContent = matter.stringify(content, data);
    fs.writeFileSync(found.filePath, updatedContent, 'utf8');
  }

  // Update schedule.json
  const schedule = readSchedule();
  const isFuture = publishDate > todayStr;
  const newStatus = isFuture ? 'scheduled' : 'published';

  const existing = schedule.posts.find(p => p.slug === slug);
  if (existing) {
    existing.status = newStatus;
    existing.scheduledDate = publishDate;
  } else {
    schedule.posts.push({
      slug,
      status: newStatus,
      scheduledDate: publishDate,
      tags: [],
    });
  }
  writeSchedule(schedule);

  return NextResponse.json({
    ok: true,
    slug,
    group: targetGroup,
    status: newStatus,
    scheduledDate: publishDate,
  });
}
