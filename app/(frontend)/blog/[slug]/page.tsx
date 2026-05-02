import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getPostBySlug, getGroupBySlug } from '@/lib/blog';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';
import SubscribeCTA from '@/app/components/SubscribeCTA';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

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

  function partNum(n: number) { return String(n).padStart(2, '0'); }

  // intro = position 1 (part 00), posts start at position 2 (part 01+)
  const currentPosition = currentIndex + 2;
  const totalCount = groupPosts.length + 1;
  const prevHref = group
    ? currentIndex === 0
      ? `/projects/${group.slug}/00`
      : `/projects/${group.slug}/${partNum(currentIndex)}`
    : undefined;
  const nextHref = group && currentIndex < groupPosts.length - 1
    ? `/projects/${group.slug}/${partNum(currentIndex + 2)}`
    : undefined;
  const nextPost = currentIndex < groupPosts.length - 1 ? groupPosts[currentIndex + 1] : null;

  const introItem = {
    num: '00',
    label: 'Introduction',
    href: `/projects/${group?.slug}/00`,
    state: 'read' as const,
  };

  const postItems = groupPosts.map((p, i) => ({
    num: partNum(i + 1),
    label: p.title,
    href: `/projects/${group?.slug}/${partNum(i + 1)}`,
    state: p.slug === slug ? ('current' as const) : i < currentIndex ? ('read' as const) : ('unread' as const),
    chapter: p.chapter,
  }));

  let drawerSections: DrawerSection[] = [];
  if (group) {
    const chapters = group.chapters?.filter(c => c.slug && c.title) ?? [];
    if (chapters.length > 0) {
      // Chapter mode: intro in its own Overview section, then one section per chapter
      const chapterSlugs = new Set(chapters.map(c => c.slug));
      const sections: DrawerSection[] = [
        { title: 'Overview', items: [introItem] },
        ...chapters.map(ch => ({
          title: ch.title,
          items: postItems.filter(item => item.chapter === ch.slug),
        })).filter(s => s.items.length > 0),
      ];
      // Posts not assigned to any defined chapter
      const orphans = postItems.filter(item => !item.chapter || !chapterSlugs.has(item.chapter));
      if (orphans.length > 0) {
        sections.push({ title: 'Other', items: orphans });
      }
      drawerSections = sections;
    } else {
      // Flat mode: single section (original behavior)
      drawerSections = [
        {
          title: group.title,
          items: [introItem, ...postItems],
        },
      ];
    }
  }

  return (
    <>
      {group && (
        <DocDrawer
          eyebrow="Series"
          groupTitle={group.title}
          author={post.author}
          currentPosition={currentPosition}
          totalCount={totalCount}
          sections={drawerSections}
          prevHref={prevHref}
          nextHref={nextHref}
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
          {group && (prevHref || nextPost) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              {prevHref ? (
                <Link href={prevHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  ← {currentIndex === 0 ? 'Introduction' : groupPosts[currentIndex - 1].title}
                </Link>
              ) : <span />}
              {nextPost && nextHref && (
                <Link href={nextHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
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

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem 6rem' }}>
        <SubscribeCTA />
      </div>
    </>
  );
}
