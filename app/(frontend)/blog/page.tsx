import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog — The Arcades',
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

export default async function BlogPage() {
  const posts = await getAllPosts();
  const published = posts.filter(p => p.date);

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Blog</h1>
      <p style={{ color: 'var(--fg-muted)', marginBottom: '3rem', fontSize: '1rem' }}>
        Writing by Austen Tucker.
      </p>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {published.map(post => {
          const rawText = post.excerpt
            ? post.excerpt
            : convertLexicalToPlaintext({ data: post.content });
          const teaser = first100Words(rawText);

          return (
            <li key={post.slug}>
              <article>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.3rem', lineHeight: 1.25 }}>
                  <Link href={`/blog/${post.slug}`} style={{ color: 'var(--fg)', textDecoration: 'none' }}>
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
                  href={`/blog/${post.slug}`}
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
