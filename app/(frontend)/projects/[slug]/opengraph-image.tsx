import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { ogSize, ogContentType, renderOgCard } from '@/lib/og-template';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Free Play Publishing';

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio · Video',
  community: 'Community',
  writing: 'Writing',
};

interface OgContext {
  groupTitle: string;
  groupCategory: string | null;
  groupMetaTitle: string | null;
  groupDescription: string | null;
}

async function loadOgContext(slug: string): Promise<OgContext | null> {
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
    return {
      groupTitle: group.title ?? slug,
      groupCategory: group.category ?? null,
      groupMetaTitle: group.meta?.title?.trim() || null,
      groupDescription: group.description?.trim() || null,
    };
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const ctx = await loadOgContext(slug);

  const title = ctx ? (ctx.groupMetaTitle || ctx.groupTitle) : 'Free Play Publishing';
  const byline = ctx?.groupDescription || '';
  const eyebrow = ctx?.groupCategory
    ? CATEGORY_LABELS[ctx.groupCategory] || ctx.groupCategory
    : null;

  return renderOgCard({ eyebrow, title, byline });
}
