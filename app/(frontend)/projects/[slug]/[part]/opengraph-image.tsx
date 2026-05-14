import { ImageResponse } from 'next/og';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { getProjectBySlug } from '@/lib/payload';
import { getGroupBySlug } from '@/lib/blog';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
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

async function loadGroupCategory(slug: string): Promise<string | null> {
  try {
    const payload = await getPayload({ config: payloadConfig });
    const result = await payload.find({
      collection: 'groups',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const cat = result.docs[0]?.category as string | undefined;
    return cat ?? null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: Props) {
  const { slug, part } = await params;
  const idx = partToIndex(part);

  const [project, group, category] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
    loadGroupCategory(slug),
  ]);

  let title = project?.title || 'The Arcades';
  let byline = project?.title || '';

  if (idx === 0) {
    title = project?.title || title;
    byline = project?.description || '';
  } else if (idx > 0 && group) {
    const post = group.posts[idx - 1];
    if (post) {
      title = post.meta?.title?.trim() || post.title;
      byline = group.title;
    }
  }

  const categoryLabel = category ? CATEGORY_LABELS[category] || category : null;

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
          <div style={{ display: 'flex', fontWeight: 600, color: '#f4f5f7' }}>thearcades.me</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
