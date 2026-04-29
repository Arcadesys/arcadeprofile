import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllProjectHubs } from '@/lib/payload';
import type { ProjectHub } from '@/lib/payload';
import { categoryLabels } from '@/components/menu';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Projects and creative work by Austen Tucker-Crowder.',
  openGraph: {
    title: 'Projects — The Arcades',
    description: 'Projects and creative work by Austen Tucker-Crowder.',
    url: 'https://thearcades.me/projects',
  },
};

const statusColors: Record<string, string> = {
  active: 'var(--neon-pink)',
  available: 'var(--accent)',
  'in-progress': 'var(--gold, #f5a623)',
  archived: 'var(--fg-muted)',
};

function ProjectCard({ project }: { project: ProjectHub }) {
  const categoryLabel = project.category ? (categoryLabels[project.category] ?? project.category) : null;
  const statusColor = project.status ? (statusColors[project.status] ?? 'var(--fg-muted)') : 'var(--fg-muted)';

  const cardContent = (
    <div
      style={{
        padding: '1.25rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        height: '100%',
        cursor: project.href ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        if (!project.href) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--neon-pink)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 12px var(--glow-pink)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.3 }}>{project.title}</h2>
        {project.status && (
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {project.status}
          </span>
        )}
      </div>

      {categoryLabel && (
        <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {categoryLabel}
        </span>
      )}

      {project.description && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          {project.description}
        </p>
      )}

      {project.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
          {project.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--fg-muted)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (!project.href) return <div>{cardContent}</div>;

  if (project.external) {
    return (
      <a href={project.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={project.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {cardContent}
    </Link>
  );
}

export default async function ProjectsPage() {
  const projects = await getAllProjectHubs();

  const featured = projects.filter(p => p.featured);
  const rest = projects.filter(p => !p.featured);

  const byCategory: Record<string, ProjectHub[]> = {};
  for (const p of rest) {
    const key = p.category ?? 'other';
    byCategory[key] = [...(byCategory[key] ?? []), p];
  }

  const categoryOrder = ['fiction', 'tools', 'experiments', 'audio-video', 'community', 'writing', 'other'];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <h1 className="gaysparkles" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Projects
      </h1>
      <p style={{ color: 'var(--fg-muted)', marginBottom: '2.5rem', fontSize: '1rem' }}>
        Creative and technical work — fiction, tools, experiments, and more.
      </p>

      {projects.length === 0 && (
        <p style={{ color: 'var(--fg-muted)' }}>No projects yet. Check back soon.</p>
      )}

      {featured.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--neon-pink)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.5rem',
            }}
          >
            Featured
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {featured.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {categoryOrder
        .filter(cat => byCategory[cat]?.length)
        .map(cat => (
          <section key={cat} style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.5rem',
              }}
            >
              {categoryLabels[cat] ?? cat}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {byCategory[cat].map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </section>
        ))}
    </main>
  );
}
