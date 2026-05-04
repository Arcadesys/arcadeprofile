import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, buildPostUrl, buildPostUrlMap } from '@/lib/blog';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Latest — The Arcades',
  description: 'Writing by Austen Tucker.',
};

function first100Words(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 100) return text.trim();
  return words.slice(0, 100).join(' ') + '…';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function LatestPage() {
  const [posts, urlMap] = await Promise.all([getAllPosts(), buildPostUrlMap()]);
  const published = posts.filter(p => p.date && urlMap.has(p.slug));

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem) 1rem clamp(3rem, 8vw, 6rem)' }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.25rem' }}>Latest</h1>
      <p style={{ color: 'var(--fg-muted)', marginBottom: '3rem', fontSize: '1rem' }}>
        Writing by Austen Tucker.
      </p>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {published.map(post => {
          const rawText = post.excerpt
            ? post.excerpt
            : convertLexicalToPlaintext({ data: post.content });
          const teaser = first100Words(rawText);
          const loc = urlMap.get(post.slug)!;
          const href = buildPostUrl(loc.groupSlug, loc.partIndex);

          return (
            <li key={post.slug}>
              <article>
                <Link
                  href={`/projects/${loc.groupSlug}/00`}
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--neon-pink)',
                    border: '1px solid rgba(255,60,172,0.4)',
                    background: 'rgba(255,60,172,0.07)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.65rem',
                    textDecoration: 'none',
                    marginBottom: '0.6rem',
                  }}
                >
                  {loc.groupTitle}
                </Link>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.3rem', lineHeight: 1.25 }}>
                  <Link href={href} style={{ color: 'var(--fg)', textDecoration: 'none' }}>
                    {post.title}
                  </Link>
                </h2>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--fg-muted)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  marginBottom: '0.85rem',
                }}>
                  {formatDate(post.date)}
                  {post.author && post.author !== 'Austen Tucker' && ` · ${post.author}`}
                </p>
                <p style={{ color: 'var(--fg)', lineHeight: 1.7, margin: '0 0 0.85rem' }}>
                  {teaser}
                </p>
                <Link
                  href={href}
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--neon-pink)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Continue reading →
                </Link>
              </article>
              <hr style={{ marginTop: '3rem', border: 'none', height: '1px', background: 'linear-gradient(90deg, transparent, var(--neon-pink), var(--accent), transparent)' }} />
            </li>
          );
        })}

        {published.length === 0 && (
          <li style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
            No posts yet. Check back soon.
          </li>
        )}
      </ol>
    </main>
  );
}
