'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface Project {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  itemCount: number;
  itemLabel: string;
  latestDate?: string;
  href: string;
}

export default function ProjectList({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const p of projects) {
      for (const t of p.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter(p => {
      if (q && !p.title.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) {
        return false;
      }
      if (activeTags.size > 0 && !p.tags.some(t => activeTags.has(t))) {
        return false;
      }
      return true;
    });
  }, [projects, query, activeTags]);

  function toggleTag(tag: string) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search projects..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--neon-pink)] transition-shadow"
        />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeTags.has(tag)
                  ? 'bg-[var(--neon-pink)] text-white border-[var(--neon-pink)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--neon-pink)] hover:text-[var(--neon-pink)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-[var(--fg-muted)] py-8">No matching projects.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(project => (
            <Link
              key={project.slug}
              href={project.href}
              className="group block border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:shadow-lg hover:shadow-[var(--glow-pink)] transition-all"
            >
              <h2 className="text-xl font-semibold text-[var(--fg)] group-hover:text-[var(--neon-pink)] transition-colors mb-1">
                {project.title}
              </h2>
              {project.description && (
                <p className="text-sm text-[var(--fg-muted)] mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--fg-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
                <span>
                  {project.itemCount} {project.itemCount === 1 ? project.itemLabel : project.itemLabel + 's'}
                </span>
                {project.latestDate && (
                  <span>
                    Latest:{' '}
                    {new Date(project.latestDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
