import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import PostRichText from '@/app/components/PostRichText';
import { getProjectBySlug } from '@/lib/payload';
import { getGroupBySlug } from '@/lib/blog';
import { resolvePostOgImageBySlug } from '@/lib/post-og-image';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { categoryLabels } from '@/components/menu';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';
import SubscribeCTA from '@/app/components/SubscribeCTA';
import ShareLinks from '@/app/components/ShareLinks';
import PostReactions from '@/app/components/PostReactions';
import { getReactionCounts } from '@/lib/reactions';
import { JsonLd } from '@/lib/structured-data';
import { buildPostUrl, buildGroupIntroUrl, partNum, resolvePostSlugByPartIndex } from '@/lib/post-url';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

const NUMERIC_PART_RE = /^\d+$/;

interface PostExtras {
  canonicalPath: string | null;
  updatedAt: string | null;
  publishedDate: string | null;
  author: string | null;
}

async function loadPostExtras(postSlug: string): Promise<PostExtras> {
  try {
    const payload = await getPayload({ config: payloadConfig });
    const result = await payload.find({
      collection: 'posts',
      where: { slug: { equals: postSlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = result.docs[0] as
      | {
          discoverability?: { canonical_path?: string };
          updatedAt?: string;
          publishedDate?: string;
          author?: string;
        }
      | undefined;
    return {
      canonicalPath: doc?.discoverability?.canonical_path?.trim() || null,
      updatedAt: doc?.updatedAt ?? null,
      publishedDate: doc?.publishedDate ?? null,
      author: doc?.author ?? null,
    };
  } catch {
    return { canonicalPath: null, updatedAt: null, publishedDate: null, author: null };
  }
}

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; postSlug: string }> };

async function redirectIfNumeric(groupSlug: string, segment: string): Promise<void> {
  if (!NUMERIC_PART_RE.test(segment)) return;
  const idx = parseInt(segment, 10);
  if (idx === 0) {
    permanentRedirect(buildGroupIntroUrl(groupSlug));
  }
  const payload = await getPayload({ config: payloadConfig });
  const resolved = await resolvePostSlugByPartIndex(payload, groupSlug, idx);
  if (resolved) permanentRedirect(buildPostUrl(groupSlug, resolved));
  notFound();
}

function buildDrawerSections(
  groupSlug: string,
  groupTitle: string,
  posts: { slug: string; title: string }[],
  currentPartIndex: number,
): DrawerSection[] {
  return [
    {
      title: groupTitle,
      items: [
        {
          num: '00',
          label: 'Introduction',
          href: buildGroupIntroUrl(groupSlug),
          state: currentPartIndex === 0 ? 'current' : 'read',
        },
        ...posts.map((p, i) => {
          const idx = i + 1;
          return {
            num: partNum(idx),
            label: p.title,
            href: buildPostUrl(groupSlug, p.slug),
            state:
              currentPartIndex === idx
                ? ('current' as const)
                : currentPartIndex > idx
                ? ('read' as const)
                : ('unread' as const),
          };
        }),
      ],
    },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postSlug } = await params;

  if (NUMERIC_PART_RE.test(postSlug)) return {};

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project || !group) return {};

  const idx = group.posts.findIndex((p) => p.slug === postSlug);
  if (idx < 0) return {};
  const post = group.posts[idx];

  const payload = await getPayload({ config: payloadConfig });
  const [og, postExtras] = await Promise.all([
    resolvePostOgImageBySlug(payload, post.slug),
    loadPostExtras(post.slug),
  ]);
  const metaTitle = post.meta?.title?.trim() || post.title;
  const metaDescription = post.meta?.description?.trim() || post.excerpt || undefined;
  const title = `${metaTitle} — ${project.title}`;
  const path = buildPostUrl(slug, postSlug);
  const url = `${SITE_URL}${path}`;
  const canonical = postExtras.canonicalPath || path;
  return {
    title,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      title,
      description: metaDescription,
      type: 'article',
      url,
      images: og
        ? [{ url: og.url, alt: og.alt ?? metaTitle, width: og.width, height: og.height }]
        : undefined,
    },
    twitter: {
      card: og ? 'summary_large_image' : 'summary',
      title,
      description: metaDescription,
      images: og ? [og.url] : undefined,
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ProjectPostPage({ params }: Props) {
  const { slug, postSlug } = await params;

  await redirectIfNumeric(slug, postSlug);

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project || !group) notFound();

  const posts = group.posts;
  const idx = posts.findIndex((p) => p.slug === postSlug);
  if (idx < 0) notFound();
  const post = posts[idx];
  const partIndex = idx + 1;
  const totalCount = posts.length + 1;

  const sections = buildDrawerSections(slug, project.title, posts, partIndex);
  const prevPartHref =
    partIndex === 1 ? buildGroupIntroUrl(slug) : buildPostUrl(slug, posts[idx - 1].slug);
  const nextPartHref =
    partIndex < posts.length ? buildPostUrl(slug, posts[idx + 1].slug) : undefined;

  const payload = await getPayload({ config: payloadConfig });
  const [og, extras, initialReactionCounts] = await Promise.all([
    resolvePostOgImageBySlug(payload, post.slug),
    loadPostExtras(post.slug),
    getReactionCounts(payload, post.id),
  ]);

  const canonicalUrl = `${SITE_URL}${buildPostUrl(slug, postSlug)}`;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta?.title?.trim() || post.title,
    description: post.meta?.description?.trim() || post.excerpt || undefined,
    datePublished: extras.publishedDate || post.date,
    dateModified: extras.updatedAt || extras.publishedDate || post.date,
    author: {
      '@type': 'Person',
      name: extras.author || post.author || 'Austen Tucker',
      '@id': `${SITE_URL}/#person`,
    },
    publisher: { '@id': `${SITE_URL}/#person` },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    url: canonicalUrl,
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: project.title,
      url: `${SITE_URL}${buildGroupIntroUrl(slug)}`,
    },
    articleSection: project.category ?? undefined,
    image: og?.url ?? undefined,
  };

  const categoryLabel = project.category ? (categoryLabels[project.category] ?? project.category) : null;

  const drawer = (
    <DocDrawer
      eyebrow={categoryLabel ?? undefined}
      groupTitle={project.title}
      currentPosition={partIndex + 1}
      totalCount={totalCount}
      sections={sections}
      prevHref={prevPartHref}
      nextHref={nextPartHref}
    />
  );

  const prevTitle = partIndex === 1 ? 'Introduction' : posts[idx - 1].title;
  const postMainCls = 'dd-post-main has-drawer';

  return (
    <>
      <JsonLd data={jsonLd} />
      {drawer}
      <main className={postMainCls}>
        <nav style={{ marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href={buildGroupIntroUrl(slug)} style={navLinkStyle}>← {project.title}</Link>
        </nav>

        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...monoMutedStyle, marginBottom: '0.5rem' }}>
            Part {partNum(partIndex)} / {partNum(posts.length)}
          </div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.75rem' }}>
            {post.title}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', margin: 0 }}>
            {formatDate(post.date)}
            {post.author && ` · ${post.author}`}
          </p>
        </header>

        <div className="prose">
          <PostRichText data={post.content} />
        </div>

        <div style={{ marginTop: '2.5rem' }}>
          <PostReactions postId={post.id} initialCounts={initialReactionCounts} />
        </div>

        <SubscribeCTA
          source="post"
          magnet="story"
          heading="Liked this? Read it as it arrives."
          blurb="Every new chapter the moment it drops. Sign up and I'll send La Ligne du Marais — a Paris noir short — to start, then the next chapter as it publishes."
          buttonLabel="Send me the story"
        />

        <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <ShareLinks url={canonicalUrl} title={post.title} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {prevPartHref ? (
              <Link href={prevPartHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                ← {prevTitle}
              </Link>
            ) : <span />}
            {nextPartHref && (
              <Link href={nextPartHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                {posts[idx + 1].title} →
              </Link>
            )}
          </div>
        </footer>
      </main>
    </>
  );
}

const navLinkStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--fg-muted)',
  textDecoration: 'none',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
};

const monoMutedStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};
