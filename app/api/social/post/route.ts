import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug } from '@/lib/blog';
import { readMarketing, writeMarketing } from '@/lib/marketing';
import { createPost } from '@/lib/bluesky';

const SITE_URL = 'https://thearcades.me';

export async function POST(request: NextRequest) {
  let body: { slug?: string; platform?: string; variant?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, platform, variant } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing required field: slug' }, { status: 400 });
  }
  if (platform !== 'bluesky') {
    return NextResponse.json({ error: 'Unsupported platform. Supported: bluesky' }, { status: 400 });
  }
  if (variant !== 'short' && variant !== 'long') {
    return NextResponse.json({ error: 'variant must be "short" or "long"' }, { status: 400 });
  }

  const post = getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: `Post not found: ${slug}` }, { status: 404 });
  }

  const marketing = readMarketing(slug);
  if (!marketing?.social) {
    return NextResponse.json(
      { error: `No marketing copy found for "${slug}". Generate marketing copy first via /api/auto-post.` },
      { status: 404 },
    );
  }

  const copyText = variant === 'short' ? marketing.social.short : marketing.social.long;
  if (!copyText) {
    return NextResponse.json(
      { error: `No "${variant}" social copy available for "${slug}".` },
      { status: 404 },
    );
  }

  const postUrl = `${SITE_URL}/blog/${slug}`;
  const textWithLink = copyText.includes(postUrl) ? copyText : `${copyText}\n\n${postUrl}`;

  try {
    const result = await createPost(
      textWithLink,
      postUrl,
      post.title,
      post.excerpt,
    );

    marketing.social.bluesky = {
      postedAt: new Date().toISOString(),
      postUri: result.uri,
      variant,
    };
    writeMarketing(slug, marketing);

    return NextResponse.json({
      success: true,
      postUri: result.uri,
      platform: 'bluesky',
      variant,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Bluesky post failed: ${message}` }, { status: 502 });
  }
}
