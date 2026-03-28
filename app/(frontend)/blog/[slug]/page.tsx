import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug, getGroupBySlug } from '@/lib/mdx';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      url: `/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const group = post.group ? getGroupBySlug(post.group) : null;

  let prevPost = null;
  let nextPost = null;
  if (group) {
    const idx = group.posts.findIndex(p => p.slug === post.slug);
    if (idx > 0) prevPost = group.posts[idx - 1];
    if (idx < group.posts.length - 1) nextPost = group.posts[idx + 1];
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <article>
          <header className="mb-8">
            {group && (
              <p className="text-sm text-[var(--fg-muted)] mb-3">
                <Link
                  href={`/writing/group/${group.slug}`}
                  className="text-[var(--accent)] hover:underline font-medium"
                >
                  {group.title}
                </Link>
                {post.order != null && (
                  <span className="text-[var(--fg-muted)]">
                    {' '}&middot; Part {post.order} of {group.posts.length}
                  </span>
                )}
              </p>
            )}
            <h1 className="text-3xl font-bold mb-2 gaysparkles">{post.title}</h1>
            {post.date && (
              <time className="text-sm text-[var(--fg-muted)]">
                {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            )}
          </header>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MDXRemote source={post.content} />
          </div>

          {group && (prevPost || nextPost) && (
            <nav className="mt-8 pt-4 border-t border-[var(--border)] flex justify-between gap-4">
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="button-link text-sm"
                >
                  &larr; {prevPost.title}
                </Link>
              ) : <span />}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="button-link text-sm text-right"
                >
                  {nextPost.title} &rarr;
                </Link>
              ) : <span />}
            </nav>
          )}

          <div className="mt-8 pt-4 border-t border-[var(--border)]">
            <Link href={group ? `/writing/group/${group.slug}` : '/blog'} className="button-link">
              &larr; {group ? `Back to ${group.title}` : 'Back to Blog'}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
