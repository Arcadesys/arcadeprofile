import Link from 'next/link';
import { getAllProjectHubs, type ProjectHub } from '@/lib/payload';
import { projectCategoryLinks } from '@/components/menu';

export const dynamic = 'force-dynamic';

const categoryLabels: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio/Video',
  community: 'Community',
};

const resourceLabels: Record<string, string> = {
  post: 'Posts',
  preview: 'Preview',
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
      {project.image && (
        <img
          src={project.image}
          alt={project.title}
          className="mb-4 h-40 w-full rounded object-cover"
        />
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

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params?.category;
  const projects = await getAllProjectHubs();
  const filteredProjects = selectedCategory
    ? projects.filter(project => project.category === selectedCategory)
    : projects;

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <h1 className="gaysparkles mb-3 text-center text-3xl font-bold">Projects</h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-[var(--fg-muted)]">
          Fiction, tools, experiments, media, and product links collected as project hubs.
        </p>

        <nav aria-label="Project categories" className="mb-8 flex flex-wrap justify-center gap-2">
          <Link
            href="/projects"
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              !selectedCategory
                ? 'border-[var(--neon-pink)] bg-[var(--neon-pink)] text-black'
                : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--neon-pink)] hover:text-[var(--neon-pink)]'
            }`}
          >
            All
          </Link>
          {projectCategoryLinks.map(category => {
            const active = selectedCategory && category.href.endsWith(`=${selectedCategory}`);
            return (
              <Link
                key={category.href}
                href={category.href}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-[var(--neon-pink)] bg-[var(--neon-pink)] text-black'
                    : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--neon-pink)] hover:text-[var(--neon-pink)]'
                }`}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        {filteredProjects.length === 0 ? (
          <p className="m-0 py-8 text-center text-[var(--fg-muted)]">No projects found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {filteredProjects.map(project => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
