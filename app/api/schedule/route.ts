import { NextRequest, NextResponse } from 'next/server';
import { readSchedule, writeSchedule, Schedule } from '@/lib/schedule';
import { getAllPosts } from '@/lib/blog';

export async function GET() {
  const schedule = readSchedule();
  const posts = getAllPosts();

  // Merge blog post metadata with schedule data
  const merged = schedule.posts.map(sp => {
    const post = posts.find(p => p.slug === sp.slug);
    return {
      ...sp,
      title: post?.title || sp.slug,
      excerpt: post?.excerpt || '',
      date: post?.date || sp.scheduledDate,
    };
  });

  // Find any blog posts not yet in the schedule (newly added files)
  const scheduledSlugs = new Set(schedule.posts.map(p => p.slug));
  const unscheduled = posts
    .filter(p => !scheduledSlugs.has(p.slug))
    .map(p => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      date: p.date,
      status: 'draft' as const,
      scheduledDate: null,
      tags: [],
      series: null,
    }));

  return NextResponse.json({
    posts: [...merged, ...unscheduled],
    series: schedule.series,
    settings: schedule.settings,
  });
}

export async function PUT(request: NextRequest) {
  const body: Schedule = await request.json();

  // Basic validation
  if (!body.posts || !Array.isArray(body.posts)) {
    return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 });
  }

  writeSchedule({
    posts: body.posts.map(p => ({
      slug: p.slug,
      status: p.status,
      scheduledDate: p.scheduledDate,
      tags: p.tags || [],
      series: p.series || null,
    })),
    series: body.series || [],
    settings: body.settings || { publishDays: ['monday', 'tuesday', 'wednesday', 'thursday'], timezone: 'America/Chicago' },
  });

  return NextResponse.json({ ok: true });
}
