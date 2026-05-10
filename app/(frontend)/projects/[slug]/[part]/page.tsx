import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PostRichText from '@/app/components/PostRichText';
import { getProjectBySlug } from '@/lib/payload';
import { getGroupBySlug } from '@/lib/blog';
import { resolvePostOgImageBySlug, resolveGroupOgImage } from '@/lib/post-og-image';
import { getPayload } from 'payload';
import payloadConfig from '@payload-config';
import { categoryLabels } from '@/components/menu';
import DocDrawer from '@/app/components/DocDrawer';
import type { DrawerSection } from '@/app/components/DocDrawer';
import SubscribeCTA from '@/app/components/SubscribeCTA';
import ShareLinks from '@/app/components/ShareLinks';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; part: string }> };

function partNum(n: number) {
  return String(n).padStart(2, '0');
}

function partToIndex(part: string): number {
  const n = parseInt(part, 10);
  return isNaN(n) ? -1 : n;
}

// ── shared drawer builder ────────────────────────────────────────────────────

function buildDrawerSections(
  groupSlug: string,
  groupTitle: string,
  postTitles: string[],
  currentPartIndex: number,
): DrawerSection[] {
  return [
    {
      title: groupTitle,
      items: [
        {
          num: '00',
          label: 'Introduction',
          href: `/projects/${groupSlug}/00`,
          state: currentPartIndex === 0 ? 'current' : 'read',
        },
        ...postTitles.map((title, i) => {
          const idx = i + 1;
          return {
            num: partNum(idx),
            label: title,
            href: `/projects/${groupSlug}/${partNum(idx)}`,
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

// ── metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, part } = await params;
  const idx = partToIndex(part);
  if (idx < 0) return {};

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project) return {};

  if (idx === 0) {
    const payload = await getPayload({ config: payloadConfig });
    const og = await resolveGroupOgImage(payload, slug);
    const title = `${project.title} — The Arcades`;
    return {
      title,
      description: project.description,
      openGraph: og
        ? {
            title,
            description: project.description ?? undefined,
            images: [{ url: og.url, alt: og.alt ?? project.title, width: og.width, height: og.height }],
          }
        : undefined,
      twitter: og
        ? { card: 'summary_large_image', title, description: project.description ?? undefined, images: [og.url] }
        : undefined,
    };
  }

  const post = group?.posts[idx - 1];
  if (!post) return {};
  const payload = await getPayload({ config: payloadConfig });
  const og = await resolvePostOgImageBySlug(payload, post.slug);
  const title = `${post.title} — ${project.title}`;
  return {
    title,
    description: post.excerpt,
    openGraph: og
      ? {
          title,
          description: post.excerpt,
          images: [{ url: og.url, alt: og.alt ?? post.title, width: og.width, height: og.height }],
        }
      : undefined,
    twitter: og
      ? { card: 'summary_large_image', title, description: post.excerpt, images: [og.url] }
      : undefined,
  };
}

// ── intro (part 00) ───────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  active: 'Active',
  available: 'Available',
  'in-progress': 'In Progress',
  archived: 'Archived',
};

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

const resourceLabels: Record<string, string> = {
  post: 'Post',
  preview: 'Sample',
  buy: 'Buy',
  youtube: 'Video',
  audio: 'Audio',
  experiment: 'Experiment',
  repo: 'Repository',
  download: 'Download',
  other: 'Link',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ProjectPartPage({ params }: Props) {
  const { slug, part } = await params;
  const idx = partToIndex(part);
  if (idx < 0) notFound();

  const [project, group] = await Promise.all([
    getProjectBySlug(slug),
    getGroupBySlug(slug),
  ]);
  if (!project) notFound();

  const posts = group?.posts ?? [];
  const totalCount = posts.length + 1; // intro + posts
  const postTitles = posts.map(p => p.title);

  // Validate part bounds
  if (idx > posts.length) notFound();

  const sections = buildDrawerSections(slug, project.title, postTitles, idx);
  const prevPartHref = idx > 0 ? `/projects/${slug}/${partNum(idx - 1)}` : undefined;
  const nextPartHref = idx < posts.length ? `/projects/${slug}/${partNum(idx + 1)}` : undefined;
  const categoryLabel = project.category ? (categoryLabels[project.category] ?? project.category) : null;

  const drawer = (
    <DocDrawer
      eyebrow={categoryLabel ?? undefined}
      groupTitle={project.title}
      currentPosition={idx + 1}
      totalCount={totalCount}
      sections={sections}
      prevHref={prevPartHref}
      nextHref={nextPartHref}
    />
  );

  const drawerCls = posts.length > 0 ? ' has-drawer' : '';
  const mainCls = `dd-intro-main${drawerCls}`;
  const postMainCls = `dd-post-main${drawerCls}`;

  // ── intro ──
  if (idx === 0) {
    const firstPost = posts[0];
    return (
      <>
        {posts.length > 0 && drawer}
        <main className={mainCls}>
          <nav style={{ marginBottom: '2.5rem' }}>
            <Link href="/projects" style={navLinkStyle}>← Projects</Link>
          </nav>

          <header style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {categoryLabel && <Badge>{categoryLabel}</Badge>}
              {project.status && (
                <Badge pink>{statusLabels[project.status] ?? project.status}</Badge>
              )}
            </div>
            <h1 style={{ fontSize: '2.25rem', lineHeight: 1.15, marginBottom: '1rem', fontWeight: 700 }}>
              {project.title}
            </h1>
            {project.description && (
              <p style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--fg-muted)', margin: 0 }}>
                {project.description}
              </p>
            )}
          </header>

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
                    <span style={kindTagStyle}>{resourceLabels[r.kind] ?? r.kind}</span>
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

          {firstPost && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={monoMutedStyle}>{posts.length} {posts.length === 1 ? 'piece' : 'pieces'}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--fg-muted)' }}>{firstPost.title}</div>
              </div>
              <Link href={`/projects/${slug}/01`} style={startReadingStyle}>Start reading →</Link>
            </div>
          )}
        </main>
      </>
    );
  }

  // ── post ──
  const post = posts[idx - 1];
  if (!post) notFound();

  const prevTitle = idx === 1 ? 'Introduction' : posts[idx - 2].title;

  return (
    <>
      {drawer}
      <main className={postMainCls}>
        <nav style={{ marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href={`/projects/${slug}/00`} style={navLinkStyle}>← {project.title}</Link>
        </nav>

        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ ...monoMutedStyle, marginBottom: '0.5rem' }}>
            Part {partNum(idx)} / {partNum(posts.length)}
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

        <SubscribeCTA
          source="post"
          magnet="story"
          heading="Liked this? Read it as it arrives."
          blurb="A weekly roundup of new chapters, or every installment as it lands. Sign up and I'll send La Ligne du Marais — a Paris noir short — to start, then the next chapter when it drops."
          buttonLabel="Send me the story"
        />

        <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <ShareLinks
            url={`${SITE_URL}/projects/${slug}/${partNum(idx)}`}
            title={post.title}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {prevPartHref ? (
              <Link href={prevPartHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                ← {prevTitle}
              </Link>
            ) : <span />}
            {nextPartHref && (
              <Link href={nextPartHref} style={{ color: 'var(--neon-pink)', textDecoration: 'none', fontSize: '0.9rem' }}>
                {posts[idx].title} →
              </Link>
            )}
          </div>
        </footer>
      </main>
    </>
  );
}

// ── style constants & tiny presentational helpers ─────────────────────────────

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
