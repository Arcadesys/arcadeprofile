import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, group, frontmatter, body: content } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format (use lowercase-kebab-case)' }, { status: 400 });
  }

  const payload = await getPayload({ config: configPromise });

  // Check for duplicates
  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
  });
  if (existing.docs.length > 0) {
    return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
  }

  const title = frontmatter?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  await payload.create({
    collection: 'posts',
    data: {
      title,
      slug,
      excerpt: frontmatter?.excerpt || '',
      content: content || { root: { children: [{ children: [{ text: '' }], type: 'paragraph', version: 1 }], direction: null, format: '', indent: 0, type: 'root', version: 1 } },
      publishedDate: frontmatter?.date || new Date().toISOString().slice(0, 10),
      publishStatus: 'draft',
      scheduledPublishDate: frontmatter?.date || undefined,
      group: group || '',
      author: 'Austen Tucker',
    },
  });

  return NextResponse.json({ ok: true, slug, group: group || null }, { status: 201 });
}
