import Link from 'next/link';
import { getAllPosts, type BlogPost } from '@/lib/blog';
import SubscribeForm from '@/app/components/SubscribeForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — The Arcades',
  description: 'Blog posts from Austen Tucker.',
};

export const dynamic = 'force-dynamic';

function collectText(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];

  if ('text' in value && typeof value.text === 'string') {
    return [value.text];
  }

  if ('children' in value && Array.isArray(value.children)) {
    return value.children.flatMap(collectText);
  }

  if ('root' in value) {
    return collectText(value.root);
  }

  return [];
}

function firstWords(post: BlogPost, count = 100): string {
  const bodyText = collectText(post.content).join(' ').replace(/\s+/g, ' ').trim();
  const source = bodyText || post.excerpt;
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length <= count) {
    return source;
  }

  return `${words.slice(0, count).join(' ')}...`;
}

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  try {
    posts = await getAllPosts();
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    // DB unavailable — render empty state rather than 500
  }

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
                <p className="text-[var(--fg-muted)] mt-3 leading-relaxed">{firstWords(post)}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-[var(--neon-pink)] hover:underline"
                >
                  Read more
                </Link>
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
