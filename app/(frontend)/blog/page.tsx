import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type { SerializedEditorState } from 'lexical';
import { getAllPosts, type BlogPost } from '@/lib/blog';
import SubscribeForm from '@/app/components/SubscribeForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — The Arcades',
  description: 'Blog posts from Austen Tucker.',
};

export const dynamic = 'force-dynamic';

function firstParagraphs(content: SerializedEditorState | undefined, n: number): SerializedEditorState | null {
  if (!content?.root?.children?.length) return null;
  const children = content.root.children as Array<{ type?: string }>;
  const paragraphs = children.filter(child => child?.type === 'paragraph').slice(0, n);
  if (paragraphs.length === 0) return null;
  return {
    ...content,
    root: {
      ...content.root,
      children: paragraphs as typeof content.root.children,
    },
  };
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
          <div className="space-y-6">
            {posts.map(post => {
              const preview = firstParagraphs(post.content, 3);
              return (
                <article
                  key={post.slug}
                  className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-5"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-semibold text-[var(--fg)] hover:text-[var(--neon-pink)] transition-colors mb-1">
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
                  {preview ? (
                    <div className="prose prose-invert max-w-none mt-3">
                      <RichText data={preview} />
                    </div>
                  ) : post.excerpt ? (
                    <p className="text-[var(--fg-muted)] mt-3">{post.excerpt}</p>
                  ) : null}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="button-link inline-block mt-4 text-sm"
                  >
                    Read full post &rarr;
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
