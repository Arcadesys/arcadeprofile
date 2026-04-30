import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — The Arcades`,
    description: post.excerpt,
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
      <nav style={{ marginBottom: '2.5rem' }}>
        <Link
          href="/blog"
          style={{
            fontSize: '0.85rem',
            color: 'var(--fg-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          ← Blog
        </Link>
      </nav>

      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.75rem' }}>
          {post.title}
        </h1>
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--fg-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          margin: 0,
        }}>
          {formatDate(post.date)}
          {post.author && ` · ${post.author}`}
        </p>
      </header>

      <div className="prose">
        <RichText data={post.content} />
      </div>

      <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <Link
          href="/blog"
          style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
        >
          ← Back to blog
        </Link>
      </footer>
    </main>
  );
}
