import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getAllPosts, getPostBySlug, getGroupBySlug } from '@/lib/blog';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';

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
  const [post, ] = await Promise.all([getPostBySlug(slug)]);
  if (!post) notFound();

  // Fetch group/series data if this post belongs to one
  const group = post.group ? await getGroupBySlug(post.group) : null;
  const groupPosts = group?.posts ?? [];
  const currentIndex = groupPosts.findIndex(p => p.slug === slug);
  const currentPosition = currentIndex + 1;
  const prevPost = currentIndex > 0 ? groupPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < groupPosts.length - 1 ? groupPosts[currentIndex + 1] : null;

  const drawerSections: DrawerSection[] = group
    ? [
        {
          title: group.title,
          items: groupPosts.map((p, i) => ({
            num: i + 1,
            label: p.title,
            href: `/blog/${p.slug}`,
            state: p.slug === slug ? 'current' : i < currentIndex ? 'read' : 'unread',
          })),
        },
      ]
    : [];

  return (
    <>
      {group && (
        <DocDrawer
          eyebrow="Series"
          groupTitle={group.title}
          author={post.author}
          currentPosition={currentPosition}
          totalCount={groupPosts.length}
          sections={drawerSections}
          prevHref={prevPost ? `/blog/${prevPost.slug}` : undefined}
          nextHref={nextPost ? `/blog/${nextPost.slug}` : undefined}
        />
      )}

      <main style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '4rem 1.5rem 6rem',
        // Shift right when drawer is visible at wide viewports
        paddingLeft: group ? 'max(1.5rem, calc(280px + 2rem))' : '1.5rem',
      }}>
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
          {group && (prevPost || nextPost) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              {prevPost ? (
                <Link href={`/blog/${prevPost.slug}`} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  ← {prevPost.title}
                </Link>
              ) : <span />}
              {nextPost && (
                <Link href={`/blog/${nextPost.slug}`} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  {nextPost.title} →
                </Link>
              )}
            </div>
          )}
          <Link
            href="/blog"
            style={{ color: 'var(--fg-muted)', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            ← Back to blog
          </Link>
        </footer>
      </main>
    </>
  );
}
