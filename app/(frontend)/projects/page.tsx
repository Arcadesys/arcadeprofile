import { getPayload } from 'payload';
import config from '@payload-config';
import type { Group } from '../../../payload-types';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Projects — The Arcades',
  description: 'Fiction, tools, experiments, and other things Austen is building.',
  openGraph: {
    title: 'Projects — The Arcades',
    description: 'Projects and creative work by Austen Tucker-Crowder.',
    url: 'https://thearcades.me/projects',
  },
};

const CATEGORY_LABELS: Record<NonNullable<Group['category']>, string> = {
  fiction:       'Fiction',
  tools:         'Tools',
  experiments:   'Experiments',
  'audio-video': 'Audio / Video',
  community:     'Community',
  writing:       'Writing',
};

const STATUS_LABELS: Record<NonNullable<Group['status']>, string> = {
  active:       'Active',
  available:    'Available',
  'in-progress':'In Progress',
  archived:     'Archived',
};

const STATUS_COLORS: Record<NonNullable<Group['status']>, string> = {
  active:       'var(--neon-pink)',
  available:    'var(--accent)',
  'in-progress':'var(--gold)',
  archived:     'var(--fg-muted)',
};

const CATEGORY_ORDER: NonNullable<Group['category']>[] = [
  'fiction', 'tools', 'experiments', 'audio-video', 'community', 'writing',
];

function ProjectCard({ group }: { group: Group }) {
  const href = group.href ?? `/projects/${group.slug}`;
  const isExternal = Boolean(group.href && group.external);
  const status = group.status ?? 'active';
  const statusColor = STATUS_COLORS[status];

  const card = (
    <div className="project-card">
      <div className="project-card-header">
        <h2 className="project-card-title">{group.title}</h2>
        <div className="project-card-meta">
          {group.category && (
            <span className="project-pill">{CATEGORY_LABELS[group.category]}</span>
          )}
          <span className="project-pill" style={{ color: statusColor, borderColor: statusColor }}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {group.description && (
        <p className="project-card-desc">{group.description}</p>
      )}

      {group.tags && group.tags.length > 0 && (
        <div className="project-card-tags">
          {group.tags.map((t) => (
            <span key={t.id ?? t.tag} className="project-tag">{t.tag}</span>
          ))}
        </div>
      )}
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {card}
      </a>
    );
  }

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {card}
    </Link>
  );
}

export default async function ProjectsPage() {
  let groups: Group[] = [];

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'groups',
      where: { status: { not_equals: 'archived' } },
      sort: '-featured,title',
      limit: 100,
    });
    groups = result.docs as Group[];
  } catch {
    // DB unavailable at build time — render empty state gracefully
  }

  const featured = groups.filter((g) => g.featured);
  const rest = groups.filter((g) => !g.featured);

  const byCategory: Partial<Record<NonNullable<Group['category']>, Group[]>> = {};
  for (const g of rest) {
    const key = (g.category ?? 'writing') as NonNullable<Group['category']>;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key]!.push(g);
  }

  return (
    <main className="projects-page">
      <header className="projects-header">
        <h1 className="gaysparkles">Projects</h1>
        <p className="projects-subtitle">
          Fiction, tools, experiments, and other things I&apos;m building.
        </p>
      </header>

      {groups.length === 0 ? (
        <p style={{ color: 'var(--fg-muted)', textAlign: 'center', marginTop: '4rem' }}>
          Projects coming soon.
        </p>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="projects-section">
              <h2 className="projects-section-label" style={{ color: 'var(--neon-pink)' }}>Featured</h2>
              <div className="projects-grid">
                {featured.map((g) => <ProjectCard key={g.id} group={g} />)}
              </div>
            </section>
          )}

          {CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length).map((cat) => (
            <section key={cat} className="projects-section">
              <h2 className="projects-section-label">{CATEGORY_LABELS[cat]}</h2>
              <div className="projects-grid">
                {byCategory[cat]!.map((g) => <ProjectCard key={g.id} group={g} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
