'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProjectHub } from '@/lib/payload';
import { projectCategoryLinks, categoryLabels } from '@/components/menu';

const resourceLabels: Record<string, string> = {
  post: 'Posts',
  preview: 'Sample',
  buy: 'Buy',
  youtube: 'Video',
  audio: 'Audio',
  experiment: 'Experiment',
  repo: 'Repo',
  download: 'Download',
  other: 'Link',
};

function getBadges(project: ProjectHub): string[] {
  const kinds = new Set(project.resources.map(resource => resource.kind));
  if (project.relatedPostSlugs.length > 0) kinds.add('post');
  return Array.from(kinds).map(kind => resourceLabels[kind]).filter(Boolean);
}

function ProjectCard({ project }: { project: ProjectHub }) {
  const badges = getBadges(project);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--neon-pink)] hover:bg-[var(--surface-hover)] hover:shadow-[0_0_18px_var(--glow-pink)]"
    >
      {project.image ? (
        <Image
          src={project.image}
          alt={project.title}
          width={640}
          height={320}
          className="mb-4 h-40 w-full rounded object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="mb-4 flex h-40 w-full items-center justify-center rounded border border-[var(--border)] bg-[rgba(255,60,172,0.08)] text-2xl font-semibold text-[var(--fg-muted)]"
        >
          {project.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {project.category && (
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
            {categoryLabels[project.category] ?? project.category}
          </span>
        )}
        {project.status && (
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
            {project.status.replace(/-/g, ' ')}
          </span>
        )}
      </div>
      <h2 className="mb-2 text-left text-xl font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--neon-pink)]">
        {project.title}
      </h2>
      <p className="m-0 mb-4 text-sm leading-relaxed text-[var(--fg-muted)]">
        {project.description}
      </p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map(badge => (
            <span
              key={badge}
              className="rounded-full border border-[rgba(255,60,172,0.35)] bg-[rgba(255,60,172,0.1)] px-2 py-0.5 text-xs text-[var(--fg)]"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function ProjectsBrowser({
  projects,
  initialCategory,
}: {
  projects: ProjectHub[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(p => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      const displayCategory = p.category ? (categoryLabels[p.category] ?? p.category) : '';
      const displayStatus = p.status ? p.status.replace(/-/g, ' ') : '';
      const haystack = [
        p.title,
        p.description,
        ...(p.tags ?? []),
        displayCategory,
        displayStatus,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query, category]);

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          placeholder="Search projects..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search projects"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--fg)] placeholder:text-[var(--fg-muted)] transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--neon-pink)]"
        />
      </div>

      <nav aria-label="Project categories" className="mb-8 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setCategory(undefined)}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            !category
              ? 'border-[var(--neon-pink)] bg-[var(--neon-pink)] text-black'
              : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--neon-pink)] hover:text-[var(--neon-pink)]'
          }`}
        >
          All
        </button>
        {projectCategoryLinks.map(link => {
          const queryString = link.href.split('?')[1] ?? '';
          const slug = new URLSearchParams(queryString).get('category') ?? undefined;
          const active = category === slug;
          return (
            <button
              key={link.href}
              type="button"
              onClick={() => setCategory(slug)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                active
                  ? 'border-[var(--neon-pink)] bg-[var(--neon-pink)] text-black'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--neon-pink)] hover:text-[var(--neon-pink)]'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <p className="m-0 py-8 text-center text-[var(--fg-muted)]">
          {projects.length === 0 ? 'No projects found.' : 'No projects match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {filtered.map(project => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
