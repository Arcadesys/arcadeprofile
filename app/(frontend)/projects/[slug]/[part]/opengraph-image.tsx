import { ImageResponse } from 'next/og';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'The Arcades';

const SITE_DOMAIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me';
  try {
    return new URL(raw).host;
  } catch {
    return 'thearcades.me';
  }
})();

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

  const categoryLabel = ctx?.groupCategory
    ? CATEGORY_LABELS[ctx.groupCategory] || ctx.groupCategory
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#0b0d10',
          backgroundImage:
            'radial-gradient(circle at 20% 0%, rgba(82, 113, 255, 0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(255, 86, 145, 0.12), transparent 50%)',
          color: '#f4f5f7',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              borderRadius: '999px',
              border: '1px solid rgba(244, 245, 247, 0.25)',
              fontSize: '24px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(244, 245, 247, 0.85)',
            }}
          >
            {categoryLabel ?? 'The Arcades'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: title.length > 60 ? '64px' : '84px',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            maxWidth: '1056px',
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            color: 'rgba(244, 245, 247, 0.7)',
            fontSize: '28px',
          }}
        >
          <div style={{ display: 'flex', maxWidth: '760px' }}>{byline}</div>
          <div style={{ display: 'flex', fontWeight: 600, color: '#f4f5f7' }}>{SITE_DOMAIN}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
