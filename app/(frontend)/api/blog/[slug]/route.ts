import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import { lexicalToPlainText } from '@/lib/lexical-text';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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

  return NextResponse.json({
    slug,
    group: doc.group || null,
    frontmatter: {
      title: doc.title || '',
      date: doc.publishedDate || '',
      excerpt: doc.excerpt || '',
      order: doc.order ?? null,
      newsletterHeading: doc.newsletterHeading || null,
      newsletterDescription: doc.newsletterDescription || null,
    },
    body: lexicalToPlainText(doc.content as Record<string, unknown>),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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
  const body = await request.json();
  const { frontmatter } = body;

  if (!frontmatter) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (frontmatter.title !== undefined) updateData.title = frontmatter.title;
  if (frontmatter.date !== undefined) updateData.publishedDate = frontmatter.date;
  if (frontmatter.excerpt !== undefined) updateData.excerpt = frontmatter.excerpt;
  if (frontmatter.order !== undefined) updateData.order = frontmatter.order;
  if (frontmatter.newsletterHeading !== undefined) updateData.newsletterHeading = frontmatter.newsletterHeading;
  if (frontmatter.newsletterDescription !== undefined) updateData.newsletterDescription = frontmatter.newsletterDescription;

  await payload.update({
    collection: 'posts',
    id: doc.id,
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}
