import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-brand';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getProjectBySlug } from '@/lib/projects';
import { getGroupBySlug } from '@/lib/blog';
import { projectCategoryLabels } from '@/lib/project-model';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';
import EndOfPieceSubscribe from '@/app/components/EndOfPieceSubscribe';
import { PieceActions } from '@/app/components/PieceActions';
import ReadingContinuityTracker from '@/app/components/ReadingContinuityTracker';
import ReadingNextSteps from '@/app/components/ReadingNextSteps';
import { getReadingCatalog } from '@/lib/reading-catalog';
import { formatSiteDate } from '@/lib/site-time';
import { JsonLd } from '@/lib/structured-data';
import {
  buildPostUrl,
  buildGroupIntroUrl,
  parsePostPartSegment,
  partNum,
} from '@/lib/post-url';
import { groupPostsByChapter, type ChapterSection } from '@/lib/post-chapters';
import MarkdownPostBody from '@/app/components/MarkdownPostBody';
import { absoluteSiteUrl, SITE_URL } from '@/lib/site-url';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/social-image';
import { stripGeneratedTitleSuffix } from '@/lib/metadata-title';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; postSlug: string }> };

async function redirectIfNumeric(groupSlug: string, segment: string): Promise<void> {
  const idx = parsePostPartSegment(segment);
  if (idx === null) return;
  if (idx === 0) {
    permanentRedirect(buildGroupIntroUrl(groupSlug));
  }
  const group = await getGroupBySlug(groupSlug);
  const post = group?.posts[idx - 1];
  if (post) permanentRedirect(buildPostUrl(groupSlug, post.slug));
  notFound();
}

function postItemState(idx: number, currentPartIndex: number) {
  if (currentPartIndex === idx) return 'current' as const;
  if (currentPartIndex > idx) return 'read' as const;
  return 'unread' as const;
}

function buildDrawerSections(
  groupSlug: string,
  groupTitle: string,
  chapterSections: ChapterSection[],
  currentPartIndex: number,
): DrawerSection[] {
  const introItem = {
    num: '00',
    label: 'Introduction',
    href: buildGroupIntroUrl(groupSlug),
    state: currentPartIndex === 0 ? ('current' as const) : ('read' as const),
  };

  if (chapterSections.length === 0) {
    return [{ title: groupTitle, items: [introItem] }];
  }

  const sections: DrawerSection[] = [];
  const [first, ...rest] = chapterSections;
  sections.push({
    title: first.title ?? groupTitle,
    items: [
      introItem,
      ...first.posts.map((p) => ({
        num: partNum(p.partIndex),
        label: p.post.title,
        href: buildPostUrl(groupSlug, p.post.slug),
        state: postItemState(p.partIndex, currentPartIndex),
      })),
    ],
  });
  for (const section of rest) {
    sections.push({
      title: section.title ?? groupTitle,
      items: section.posts.map((p) => ({
        num: partNum(p.partIndex),
        label: p.post.title,
        href: buildPostUrl(groupSlug, p.post.slug),
        state: postItemState(p.partIndex, currentPartIndex),
      })),
    });
  }
  return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postSlug } = await params;

  if (parsePostPartSegment(postSlug) !== null) return {};

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project || !group) return {};

  const idx = group.posts.findIndex((p) => p.slug === postSlug);
  if (idx < 0) return {};
  const post = group.posts[idx];

  const metaTitle = post.meta?.title?.trim() || post.title;
  const titleWithoutGeneratedSuffix = stripGeneratedTitleSuffix(metaTitle, project.title, SITE_NAME);
  const metaDescription = post.meta?.description?.trim() || post.excerpt || undefined;
  const titleForOg = `${titleWithoutGeneratedSuffix} | ${project.title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${buildPostUrl(slug, postSlug)}`;
  return {
    title: `${titleWithoutGeneratedSuffix} | ${project.title}`,
    description: metaDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: titleForOg,
      description: metaDescription,
      type: 'article',
      url: canonicalUrl,
      images: [post.hero ? { url: post.hero.src, alt: post.hero.alt } : DEFAULT_SOCIAL_IMAGE],
    },
    twitter: {
      card: post.hero ? 'summary_large_image' : 'summary',
      title: titleForOg,
      description: metaDescription,
      images: [post.hero?.src ?? DEFAULT_SOCIAL_IMAGE.url],
    },
  };
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
  const totalCount = posts.length;

  const chapterSections = groupPostsByChapter(group);
  const sections = buildDrawerSections(slug, project.title, chapterSections, partIndex);
  const prevPartHref =
    partIndex === 1 ? buildGroupIntroUrl(slug) : buildPostUrl(slug, posts[idx - 1].slug);
  const nextPartHref =
    partIndex < posts.length ? buildPostUrl(slug, posts[idx + 1].slug) : undefined;

  const readingCatalog = await getReadingCatalog();

  const canonicalUrl = `${SITE_URL}${buildPostUrl(slug, postSlug)}`;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta?.description?.trim() || post.excerpt || undefined,
    datePublished: post.date,
    dateModified: post.updatedDate || post.date,
    author: {
      '@type': 'Person',
      name: post.author || 'Austen Tucker',
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
    image: post.hero?.src ?? absoluteSiteUrl(DEFAULT_SOCIAL_IMAGE.url),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'Projects', item: `${SITE_URL}/projects` },
      { name: project.title, item: `${SITE_URL}${buildGroupIntroUrl(slug)}` },
      { name: post.title, item: canonicalUrl },
    ].map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };

  const categoryLabel = project.category ? (projectCategoryLabels[project.category] ?? project.category) : null;
  const subscriptionAudience = project.category === 'fiction'
    ? 'fiction'
    : project.category === 'writing'
      ? 'essays'
      : 'lab';
  const subscriptionKind = project.category === 'fiction'
    ? 'story'
    : project.category === 'writing'
      ? 'essay'
      : 'build note';
  const readingPiece = readingCatalog.find((candidate) => candidate.canonicalPath === buildPostUrl(slug, postSlug))!;

  const drawer = (
    <DocDrawer
      eyebrow={categoryLabel ?? undefined}
      groupTitle={project.title}
      currentPosition={partIndex}
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
      <JsonLd data={breadcrumbJsonLd} />
      {drawer}
      <ReadingContinuityTracker piece={readingPiece} />
      <main className={postMainCls}>
        <nav style={{ marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href={buildGroupIntroUrl(slug)} style={navLinkStyle}>← {project.title}</Link>
        </nav>

        <article className="longform-article">
          <header style={{ marginBottom: '2.5rem' }}>
            <div style={{ ...monoMutedStyle, marginBottom: '0.5rem' }}>
              Part {partNum(partIndex)} / {partNum(posts.length)}
            </div>
            <h1 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '0.75rem' }}>
              {post.title}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', margin: 0 }}>
              {formatSiteDate(post.date)}
              {post.author && ` · ${post.author}`}
            </p>
          </header>

          <MarkdownPostBody markdown={post.markdownBody} />
        </article>

        <ReadingNextSteps piece={readingPiece} catalog={readingCatalog} />

        <EndOfPieceSubscribe
          audience={subscriptionAudience}
          source="post-end"
          kind={subscriptionKind}
          seriesTitle={project.title}
          totalParts={posts.length}
          seriesActive={project.status === 'active'}
        />

        <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <PieceActions
            title={post.title}
            readHref={buildPostUrl(slug, postSlug)}
            pdfHref={`${buildPostUrl(slug, postSlug)}/pdf`}
            shareUrl={canonicalUrl}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {prevPartHref ? (
              <Link href={prevPartHref} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '1rem' }}>
                ← {prevTitle}
              </Link>
            ) : <span />}
            {nextPartHref && (
              <Link href={nextPartHref} style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '1rem' }}>
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
  display: 'inline-flex',
  minHeight: '44px',
  alignItems: 'center',
  fontSize: '1rem',
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
