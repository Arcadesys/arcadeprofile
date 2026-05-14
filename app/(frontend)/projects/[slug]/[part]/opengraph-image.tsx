import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'The Arcades';

type Props = { params: Promise<{ slug: string; part: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio · Video',
  community: 'Community',
  writing: 'Writing',
};

function partToIndex(part: string): number {
  const n = parseInt(part, 10);
  return isNaN(n) ? -1 : n;
}

interface OgContext {
  groupTitle: string;
  groupCategory: string | null;
  groupMetaTitle: string | null;
  groupDescription: string | null;
  post: { title: string; metaTitle: string | null } | null;
}

async function loadOgContext(slug: string, idx: number): Promise<OgContext | null> {
  try {
    const payload = await getPayload({ config: payloadConfig });
    const groupResult = await payload.find({
      collection: 'groups',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const group = groupResult.docs[0] as
      | {
          title?: string;
          category?: string;
          description?: string;
          meta?: { title?: string };
        }
      | undefined;
    if (!group) return null;

    const ctx: OgContext = {
      groupTitle: group.title ?? slug,
      groupCategory: group.category ?? null,
      groupMetaTitle: group.meta?.title?.trim() || null,
      groupDescription: group.description?.trim() || null,
      post: null,
    };

    if (idx > 0) {
      const postResult = await payload.find({
        collection: 'posts',
        where: {
          and: [
            { group: { equals: slug } },
            { publish_status: { in: ['published', 'sent'] } },
          ],
        },
        sort: 'order',
        limit: 100,
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
    }

    return ctx;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: Props) {
  const { slug, part } = await params;
  const idx = partToIndex(part);
  const ctx = await loadOgContext(slug, idx);

  let title = ctx?.groupTitle || 'The Arcades';
  let byline = '';

  if (ctx) {
    if (idx === 0) {
      title = ctx.groupMetaTitle || ctx.groupTitle;
      byline = ctx.groupDescription || '';
    } else if (ctx.post) {
      title = ctx.post.metaTitle || ctx.post.title;
      byline = ctx.groupTitle;
    }
  }

  const eyebrow = ctx?.groupCategory
    ? CATEGORY_LABELS[ctx.groupCategory] || ctx.groupCategory
    : null;

  return renderOgCard({ eyebrow, title, byline });
}
