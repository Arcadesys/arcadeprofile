import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import SubscribeForm from '@/app/components/SubscribeForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — The Arcades',
  description: 'Blog posts from Austen Tucker.',
};

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Blog</h1>
        <p className="text-center text-[var(--fg-muted)] mb-8 max-w-xl mx-auto">
          Essays in chronological order.
        </p>

        {posts.length === 0 ? (
          <p className="text-center text-[var(--fg-muted)]">No posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <article
                key={post.slug}
                className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-5"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-lg font-semibold text-[var(--fg)] hover:text-[var(--neon-pink)] transition-colors mb-1">
                    {post.title}
                  </h2>
                </Link>
                <time className="text-sm text-[var(--fg-muted)] mb-2 block">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                {post.group && (
                  <Link
                    href={`/writing/group/${post.group}`}
                    className="text-xs text-[var(--fg-muted)] hover:text-[var(--neon-pink)] transition-colors"
                  >
                    in {post.group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Link>
                )}
                <p className="text-[var(--fg-muted)] mt-1">{post.excerpt}</p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12">
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
