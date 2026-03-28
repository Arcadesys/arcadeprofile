import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: 'posts',
    limit: 200,
    sort: '-publishedDate',
    depth: 0,
    draft: true,
  });

  const posts = result.docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title || doc.slug,
    excerpt: doc.excerpt || '',
    date: doc.publishedDate,
    group: doc.group || null,
    status: (doc as any)._status || 'draft',
    scheduledDate: doc.scheduledPublishDate || null,
    tags: Array.isArray(doc.tags) ? doc.tags.map((t: { tag: string }) => t.tag) : [],
  }));

  // Collect unique groups
  const groupSet = new Set<string>();
  for (const p of posts) {
    if (p.group) groupSet.add(p.group);
  }

  return NextResponse.json({
    posts,
    settings: { publishDays: ['monday', 'wednesday', 'friday'], timezone: 'America/Chicago' },
    groups: Array.from(groupSet),
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!body.posts || !Array.isArray(body.posts)) {
    return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 });
  }

  const payload = await getPayload({ config: configPromise });
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: body.settings?.timezone || 'America/Chicago' });

  for (const p of body.posts) {
    const result = await payload.find({
      collection: 'posts',
      where: { slug: { equals: p.slug } },
      limit: 1,
      depth: 0,
    });

    if (result.docs.length === 0) continue;

    const doc = result.docs[0];
    const _status = p.status === 'published' ? 'published' : 'draft';

    await payload.update({
      collection: 'posts',
      id: doc.id,
      data: {
        _status,
        scheduledPublishDate: p.scheduledDate || undefined,
        tags: Array.isArray(p.tags) ? p.tags.map((t: string) => ({ tag: t })) : undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
