import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const { group, scheduledDate } = body as { group?: string; scheduledDate?: string };

  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });

  if (result.docs.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const doc = result.docs[0];

  if (!doc.title || !(doc.title as string).trim()) {
    return NextResponse.json({ error: 'Post must have a title before publishing' }, { status: 422 });
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const publishDate = scheduledDate || (doc.publishedDate as string) || todayStr;
  const isFuture = publishDate > todayStr;
  const newStatus = isFuture ? 'scheduled' : 'published';

  const updateData: Record<string, unknown> = {
    status: newStatus,
    publishedDate: publishDate,
    scheduledPublishDate: publishDate,
  };

  if (group !== undefined) {
    updateData.group = group || '';
  }

  await payload.update({
    collection: 'posts',
    id: doc.id,
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    slug,
    group: group !== undefined ? (group || null) : (doc.group || null),
    status: newStatus,
    scheduledDate: publishDate,
  });
}
