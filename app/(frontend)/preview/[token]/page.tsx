import type { Metadata } from 'next';
import { notFound, redirect, RedirectType } from 'next/navigation';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';

import PostRichText from '@/app/components/PostRichText';
import { getPostLocationBySlug } from '@/lib/post-url';
import { resolvePostOgImage } from '@/lib/post-og-image';
import { PREVIEW_TOKEN_PATTERN } from '@/lib/preview-token';
import type { Post } from '@/payload-types';
import PreviewBanner from './PreviewBanner';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(
  /\/+$/,
  '',
);

export const dynamic = 'force-dynamic';

const NOINDEX = { index: false, follow: false, nocache: true } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  if (!PREVIEW_TOKEN_PATTERN.test(token)) return { robots: NOINDEX };

  const payload = await getPayload({ config: payloadConfig });
  const result = await payload.find({
    collection: 'posts',
    where: { previewToken: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const post = result.docs[0] as Post | undefined;
  if (!post) return { robots: NOINDEX };

  const metaTitle = post.meta?.title?.trim() || (post.title as string);
  const metaDescription = post.meta?.description?.trim() || (post.excerpt as string | undefined);
  const og = await resolvePostOgImage(payload, post);
  const url = `${SITE_URL}/preview/${token}`;

  return {
    title: metaTitle,
    description: metaDescription,
    robots: NOINDEX,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      url,
      images: og
        ? [{ url: og.url, alt: og.alt ?? metaTitle, width: og.width, height: og.height }]
        : undefined,
    },
    twitter: {
      card: og ? 'summary_large_image' : 'summary',
      title: metaTitle,
      description: metaDescription,
      images: og ? [og.url] : undefined,
    },
  };
}

type Props = { params: Promise<{ token: string }> };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;
  if (!PREVIEW_TOKEN_PATTERN.test(token)) notFound();

  const payload = await getPayload({ config: payloadConfig });
  const result = await payload.find({
    collection: 'posts',
    where: { previewToken: { equals: token } },
    limit: 1,
    // depth >= 1 so lexical upload nodes inside post.content get their
    // Media doc populated; the default upload→JSX converter returns null
    // when value is still just an ID, so images would otherwise vanish.
    depth: 1,
    overrideAccess: true,
  });

  const post = result.docs[0];
  if (!post) notFound();

  const status = (post.publish_status as string | undefined) ?? 'draft';
  const isPublic = status === 'published' || status === 'sent';

  if (isPublic) {
    const location = await getPostLocationBySlug(payload, post.slug as string);
    if (location) redirect(location.url, RedirectType.replace);
    // Fallthrough: post is "public" but not resolvable to a canonical URL
    // (no group set, or not in published siblings). Render the preview view
    // so the editor can still see it.
  }

  const publishedDate = (post.publishedDate as string | undefined) ?? null;
  const scheduledPublishDate = (post.scheduledPublishDate as string | undefined) ?? null;
  const tags = Array.isArray(post.tags) ? (post.tags as Array<{ tag?: string } | string>) : [];

  return (
    <>
      <PreviewBanner status={status} scheduledPublishDate={scheduledPublishDate} />
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '2.5rem 1.5rem 5rem',
        }}
      >
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.75rem' }}>
            {post.title as string}
          </h1>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            {publishedDate ? formatDate(publishedDate) : 'Unscheduled'}
            {post.author ? ` · ${post.author as string}` : ''}
          </p>
          {post.excerpt ? (
            <p
              style={{
                marginTop: '1rem',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                color: 'var(--fg-muted)',
              }}
            >
              {post.excerpt as string}
            </p>
          ) : null}
        </header>

        <div className="prose">
          <PostRichText data={post.content as Parameters<typeof PostRichText>[0]['data']} />
        </div>

        {tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginTop: '2.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            {tags.map((t, i) => {
              const label = typeof t === 'string' ? t : t?.tag;
              if (!label) return null;
              return (
                <span
                  key={`${label}-${i}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.6rem',
                    border: '1px solid rgba(255,60,172,0.3)',
                    background: 'rgba(255,60,172,0.07)',
                    borderRadius: '999px',
                    color: 'var(--fg)',
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
