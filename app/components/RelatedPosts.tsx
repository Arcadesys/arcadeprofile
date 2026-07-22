import Link from 'next/link';
import { formatSiteDate } from '@/lib/site-time';
import { buildGroupIntroUrl } from '@/lib/post-url';
import type { RelatedPost } from '@/lib/related-posts';

export default function RelatedPosts({ items }: { items: RelatedPost[] }) {
  if (items.length === 0) return null;

  return (
    <section style={{ margin: '2.5rem 0' }} aria-label="Related reading">
      <h2 style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--fg-muted)',
        marginBottom: '1rem',
      }}>
        Keep reading
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1.25rem' }}>
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={buildGroupIntroUrl(item.groupSlug)}
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--neon-pink)',
                border: '1px solid rgba(255,60,172,0.4)',
                background: 'rgba(255,60,172,0.07)',
                borderRadius: '999px',
                padding: '0.15rem 0.6rem',
                textDecoration: 'none',
                marginBottom: '0.35rem',
              }}
            >
              {item.groupTitle}
            </Link>
            <div>
              <Link href={item.href} style={{ color: 'var(--fg)', textDecoration: 'none', fontWeight: 600 }}>
                {item.title}
              </Link>
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              margin: '0.2rem 0 0',
            }}>
              {formatSiteDate(item.date)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
