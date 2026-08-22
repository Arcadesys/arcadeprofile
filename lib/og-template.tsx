import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site-brand';

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';

export function siteDomain(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me';
  try {
    return new URL(raw).host;
  } catch {
    return 'thearcades.me';
  }
}

export interface OgCardInput {
  /** Small uppercase chip shown top-left. Falls back to the canonical site name. */
  eyebrow?: string | null;
  /** Big headline. Auto-scales smaller when long. */
  title: string;
  /** Bottom-left supporting line. Optional. */
  byline?: string | null;
}

export function renderOgCard({ eyebrow, title, byline }: OgCardInput) {
  const chip = eyebrow?.trim() || SITE_NAME;
  const titleSize = title.length > 60 ? 64 : 84;
  const domain = siteDomain();

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
            {chip}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: `${titleSize}px`,
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
          <div style={{ display: 'flex', maxWidth: '760px' }}>{byline ?? ''}</div>
          <div style={{ display: 'flex', fontWeight: 600, color: '#f4f5f7' }}>{domain}</div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
