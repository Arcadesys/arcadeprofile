import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'The Arcades';

type Props = { params: Promise<{ slug: string; postSlug: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio · Video',
  community: 'Community',
  writing: 'Writing',
};

const NUMERIC_PART_RE = /^\d+$/;

interface OgContext {
  groupTitle: string;
  groupCategory: string | null;
  post: { title: string; metaTitle: string | null } | null;
}

async function loadOgContext(groupSlug: string, postSlug: string): Promise<OgContext | null> {
  try {
    const payload = await getPayload({ config: payloadConfig });
    const groupResult = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const group = groupResult.docs[0] as
      | { title?: string; category?: string }
      | undefined;
    if (!group) return null;

    const ctx: OgContext = {
      groupTitle: group.title ?? groupSlug,
      groupCategory: group.category ?? null,
      post: null,
    };

    // Legacy numeric paths still render an OG card for scrapers that hit
    // the URL before following the redirect.
    if (NUMERIC_PART_RE.test(postSlug)) {
      const idx = parseInt(postSlug, 10);
      if (idx <= 0) return ctx;
      const postResult = await payload.find({
        collection: 'posts',
        where: {
          and: [
            { group: { equals: groupSlug } },
            { publish_status: { in: ['published', 'sent'] } },
          ],
        },
        sort: ['order', 'publishedDate'],
        limit: 200,
        depth: 0,
        overrideAccess: true,
      });
      const post = postResult.docs[idx - 1] as
        | { title?: string; meta?: { title?: string } }
        | undefined;
      if (post) {
        ctx.post = {
          title: post.title ?? '',
          metaTitle: post.meta?.title?.trim() || null,
        };
      }
      return ctx;
    }

    const postResult = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { slug: { equals: postSlug } },
          { group: { equals: groupSlug } },
          { publish_status: { in: ['published', 'sent'] } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const post = postResult.docs[0] as
      | { title?: string; meta?: { title?: string } }
      | undefined;
    if (post) {
      ctx.post = {
        title: post.title ?? '',
        metaTitle: post.meta?.title?.trim() || null,
      };
    }
    return ctx;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: Props) {
  const { slug, postSlug } = await params;
  const ctx = await loadOgContext(slug, postSlug);

  let title = ctx?.groupTitle || 'The Arcades';
  let byline = '';

  if (ctx?.post) {
    title = ctx.post.metaTitle || ctx.post.title;
    byline = ctx.groupTitle;
  }

  const eyebrow = ctx?.groupCategory
    ? CATEGORY_LABELS[ctx.groupCategory] || ctx.groupCategory
    : null;

  return renderOgCard({ eyebrow, title, byline });
}
