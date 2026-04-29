import { getPayload } from 'payload';
import config from '@payload-config';
import type { Group } from '../../../payload-types';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Projects — The Arcades',
  description: 'Fiction, tools, experiments, and other things Austen is building.',
};

const CATEGORY_LABELS: Record<NonNullable<Group['category']>, string> = {
  fiction:      'Fiction',
  tools:        'Tools',
  experiments:  'Experiments',
  'audio-video':'Audio / Video',
  community:    'Community',
  writing:      'Writing',
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

function ProjectCard({ group }: { group: Group }) {
  const href = group.href ?? `/projects/${group.slug}`;
  const isExternal = Boolean(group.href && group.external);
  const status = group.status ?? 'active';
  const statusColor = STATUS_COLORS[status];

  return (
    <article className="project-card">
      <div className="project-card-header">
        <h2 className="project-card-title">
          <Link
            href={href}
            {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {group.title}
          </Link>
        </h2>
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

      {group.projectCTA?.href && group.projectCTA?.label && (
        <Link
          href={group.projectCTA.href}
          className="project-cta"
          {...(group.projectCTA.type === 'buy' ? { 'data-type': 'buy' } : {})}
        >
          {group.projectCTA.label}
        </Link>
      )}
    </article>
  );
}

export default async function ProjectsPage() {
  let groups: Group[] = [];

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'groups',
      where: { 'status': { not_equals: 'archived' } },
      sort: '-featured,title',
      limit: 100,
    });
    groups = result.docs as Group[];
  } catch {
    // DB unavailable at build time — render empty state gracefully
  }

  const featured = groups.filter((g) => g.featured);
  const rest = groups.filter((g) => !g.featured);

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
              <h2 className="projects-section-label">Featured</h2>
              <div className="projects-grid">
                {featured.map((g) => <ProjectCard key={g.id} group={g} />)}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="projects-section">
              {featured.length > 0 && (
                <h2 className="projects-section-label">All Projects</h2>
              )}
              <div className="projects-grid">
                {rest.map((g) => <ProjectCard key={g.id} group={g} />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
