import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProjectBySlug } from '@/lib/payload';
import { getGroupBySlug } from '@/lib/blog';
import { resolveGroupOgImage } from '@/lib/post-og-image';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { projectCategoryLabels, projectResourceLabels, projectStatusLabels } from '@/lib/project-model';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';
import PostRichText from '@/app/components/PostRichText';
import { JsonLd } from '@/lib/structured-data';
import { buildPostUrl, buildGroupIntroUrl, partNum } from '@/lib/post-url';
import { groupPostsByChapter, type ChapterSection } from '@/lib/post-chapters';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

async function loadGroupExtras(groupSlug: string): Promise<{ canonicalPath: string | null; updatedAt: string | null }> {
  try {
    const payload = await getPayload({ config: payloadConfig });
    const result = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = result.docs[0] as
      | { discoverability?: { canonical_path?: string }; updatedAt?: string }
      | undefined;
    return {
      canonicalPath: doc?.discoverability?.canonical_path?.trim() || null,
      updatedAt: doc?.updatedAt ?? null,
    };
  } catch {
    return { canonicalPath: null, updatedAt: null };
  }
}

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

function buildDrawerSections(
  groupSlug: string,
  groupTitle: string,
  chapterSections: ChapterSection[],
): DrawerSection[] {
  const introItem = {
    num: '00',
    label: 'Introduction',
    href: buildGroupIntroUrl(groupSlug),
    state: 'current' as const,
  };

  if (chapterSections.length === 0) {
    return [{ title: groupTitle, items: [introItem] }];
  }

  const sections: DrawerSection[] = [];
  const [first, ...rest] = chapterSections;
  const firstLabel = first.title ?? groupTitle;
  sections.push({
    title: firstLabel,
    items: [
      introItem,
      ...first.posts.map((p) => ({
        num: partNum(p.partIndex),
        label: p.post.title,
        href: buildPostUrl(groupSlug, p.post.slug),
        state: 'unread' as const,
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
        state: 'unread' as const,
      })),
    });
  }

  return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project) return {};

  const payload = await getPayload({ config: payloadConfig });
  const [og, groupExtras] = await Promise.all([
    resolveGroupOgImage(payload, slug),
    loadGroupExtras(slug),
  ]);
  const metaTitle = group?.meta?.title?.trim() || project.title;
  const metaDescription = group?.meta?.description?.trim() || project.description || undefined;
  const titleForOg = `${metaTitle} | Free Play Publishing`;
  const path = buildGroupIntroUrl(slug);
  const url = `${SITE_URL}${path}`;
  const canonical = groupExtras.canonicalPath || path;
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      title: titleForOg,
      description: metaDescription,
      type: 'article',
      url,
      images: og
        ? [{ url: og.url, alt: og.alt ?? metaTitle, width: og.width, height: og.height }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: titleForOg,
      description: metaDescription,
      images: og ? [og.url] : undefined,
    },
  };
}

const ctaIcons: Record<string, string> = {
  preview: '📖',
  buy: '🛒',
  experiment: '🧪',
  youtube: '▶',
  audio: '🎧',
  repo: '⌥',
  download: '↓',
  other: '→',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ProjectIntroPage({ params }: Props) {
  const { slug } = await params;

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project) notFound();

  const posts = group?.posts ?? [];
  const totalCount = posts.length + 1;
  const firstPost = posts[0];
  const chapterSections = group ? groupPostsByChapter(group) : [];
  const hasNamedChapters = chapterSections.some((s) => s.slug !== null);

  const sections = buildDrawerSections(slug, project.title, chapterSections);
  const nextPartHref = firstPost ? buildPostUrl(slug, firstPost.slug) : undefined;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: project.title,
    description: project.description ?? undefined,
    url: `${SITE_URL}${buildGroupIntroUrl(slug)}`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    author: { '@id': `${SITE_URL}/#person` },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'Projects', item: `${SITE_URL}/projects` },
      { name: project.title, item: `${SITE_URL}${buildGroupIntroUrl(slug)}` },
    ].map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };

  const categoryLabel = project.category ? (projectCategoryLabels[project.category] ?? project.category) : null;

  const drawer = (
    <DocDrawer
      eyebrow={categoryLabel ?? undefined}
      groupTitle={project.title}
      currentPosition={1}
      totalCount={totalCount}
      sections={sections}
      prevHref={undefined}
      nextHref={nextPartHref}
    />
  );

  const mainCls = posts.length > 0 ? 'dd-intro-main has-drawer' : 'dd-intro-main';

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {posts.length > 0 && drawer}
      <main className={mainCls}>
        <nav style={{ marginBottom: '2.5rem' }}>
          <Link href="/projects" style={navLinkStyle}>← Projects</Link>
        </nav>

        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {categoryLabel && <Badge>{categoryLabel}</Badge>}
            {project.status && (
              <Badge pink>{projectStatusLabels[project.status] ?? project.status}</Badge>
            )}
          </div>
          <h1 style={{ fontSize: '2.25rem', lineHeight: 1.15, marginBottom: '1rem', fontWeight: 700 }}>
            {project.title}
          </h1>
          {project.description && (
            <div style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--fg-muted)' }}>
              {project.description.split(/\n\s*\n/).map((para, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '0.85rem 0 0' }}>{para}</p>
              ))}
            </div>
          )}
        </header>

        {project.jacketDescription && (
          <div style={{
            marginBottom: '2.5rem',
            padding: '1.25rem 1.5rem',
            borderLeft: '3px solid var(--neon-pink)',
            background: 'rgba(255,60,172,0.05)',
            borderRadius: '0 6px 6px 0',
          }}>
            <div className="prose prose-jacket">
              <PostRichText data={project.jacketDescription} />
            </div>
          </div>
        )}

        {project.image && (
          <div style={{ marginBottom: '2.5rem' }}>
            <Image
              src={project.image}
              alt={project.title}
              width={680}
              height={340}
              style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {project.primaryCTA?.href && (
          <div style={{ marginBottom: '2.5rem' }}>
            <a
              href={project.primaryCTA.href}
              target={project.external ? '_blank' : undefined}
              rel={project.external ? 'noopener noreferrer' : undefined}
              style={ctaButtonStyle}
            >
              {project.primaryCTA.type && ctaIcons[project.primaryCTA.type]}{' '}
              {project.primaryCTA.label ?? 'Open Project'}
            </a>
          </div>
        )}

        {project.resources.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <SectionLabel>Resources</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {project.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.href}
                  target={r.external ? '_blank' : undefined}
                  rel={r.external ? 'noopener noreferrer' : undefined}
                  style={resourceRowStyle}
                >
                  <span style={kindTagStyle}>{projectResourceLabels[r.kind] ?? r.kind}</span>
                  <span style={{ fontSize: '0.9rem' }}>{r.label}</span>
                  {r.description && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
                      {r.description}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {project.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '2.5rem' }}>
            {project.tags.map(tag => <TagPill key={tag}>{tag}</TagPill>)}
          </div>
        )}

        {posts.length > 0 && (
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <SectionLabel>
                {posts.length} {project.format === 'collection'
                  ? (posts.length === 1 ? 'piece' : 'pieces')
                  : (posts.length === 1 ? 'part' : 'parts')}
              </SectionLabel>
              {firstPost && project.format !== 'collection' && (
                <Link href={buildPostUrl(slug, firstPost.slug)} style={startReadingStyle}>Start reading →</Link>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {chapterSections.map((section, sIdx) => (
                <div key={section.slug ?? `unassigned-${sIdx}`}>
                  {hasNamedChapters && section.title && (
                    <h3 style={chapterHeadingStyle}>{section.title}</h3>
                  )}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {section.posts.map(({ post: p, partIndex }) => (
                      <li key={p.slug}>
                        <Link
                          href={buildPostUrl(slug, p.slug)}
                          style={collectionItemStyle}
                        >
                          {project.format !== 'collection' && (
                            <span style={partLabelStyle}>Part {partNum(partIndex)}</span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.15rem' }}>{p.title}</div>
                            {p.excerpt && (
                              <div style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                {p.excerpt}
                              </div>
                            )}
                          </div>
                          <span style={{ ...monoMutedStyle, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
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

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.65rem 1.4rem',
  background: 'var(--neon-pink)',
  color: '#000',
  fontWeight: 600,
  fontSize: '0.95rem',
  borderRadius: '6px',
  textDecoration: 'none',
  boxShadow: '0 0 18px var(--glow-pink)',
};

const resourceRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.6rem 0.9rem',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  textDecoration: 'none',
  color: 'var(--fg)',
  background: 'var(--surface)',
};

const kindTagStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  color: 'var(--fg-muted)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '0.1rem 0.4rem',
  whiteSpace: 'nowrap',
};

const collectionItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.85rem 1rem',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  textDecoration: 'none',
  color: 'var(--fg)',
  background: 'var(--surface)',
};

const partLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '0.15rem 0.45rem',
  alignSelf: 'flex-start',
  whiteSpace: 'nowrap',
};

const chapterHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--neon-pink)',
  margin: '0 0 0.75rem',
  fontWeight: 600,
};

const startReadingStyle: React.CSSProperties = {
  padding: '0.55rem 1.2rem',
  border: '1px solid var(--neon-pink)',
  color: 'var(--neon-pink)',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '0.9rem',
  whiteSpace: 'nowrap',
};

function Badge({ children, pink }: { children: React.ReactNode; pink?: boolean }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: pink ? 'var(--neon-pink)' : 'var(--fg-muted)',
      border: `1px solid ${pink ? 'rgba(255,60,172,0.4)' : 'var(--border)'}`,
      borderRadius: '999px',
      padding: '0.2rem 0.65rem',
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--fg-muted)',
      marginBottom: '1rem',
    }}>
      {children}
    </h2>
  );
}

function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      padding: '0.2rem 0.6rem',
      border: '1px solid rgba(255,60,172,0.3)',
      background: 'rgba(255,60,172,0.07)',
      borderRadius: '999px',
      color: 'var(--fg)',
    }}>
      {children}
    </span>
  );
}
