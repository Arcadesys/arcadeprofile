import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllProjectHubs, getProjectBySlug, type ProjectHub, type ProjectResource } from '@/lib/payload';
import { getPostsBySlugs } from '@/lib/blog';

export const dynamic = 'force-dynamic';

const kindLabels: Record<string, string> = {
  post: 'Posts',
  preview: 'Samples',
  buy: 'Buy',
  youtube: 'Video',
  audio: 'Audio',
  experiment: 'Experiments',
  repo: 'Code',
  download: 'Downloads',
  other: 'Links',
};

function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function getYouTubeEmbedUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function groupResources(resources: ProjectResource[]) {
  return resources.reduce<Record<string, ProjectResource[]>>((groups, resource) => {
    const key = resource.kind || 'other';
    groups[key] = groups[key] || [];
    groups[key].push(resource);
    return groups;
  }, {});
}

function ResourceLink({ resource }: { resource: ProjectResource }) {
  const external = resource.external ?? isExternalHref(resource.href);

  return (
    <a
      href={resource.href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--neon-pink)] hover:bg-[var(--surface-hover)]"
    >
      <span className="block font-semibold text-[var(--fg)]">
        {resource.label}
        {external ? ' ↗' : ''}
      </span>
      {resource.description && (
        <span className="mt-1 block text-sm leading-relaxed text-[var(--fg-muted)]">
          {resource.description}
        </span>
      )}
    </a>
  );
}

function ProjectCta({ project }: { project: ProjectHub }) {
  const cta = project.primaryCTA;
  const href = cta?.href || project.href;
  const label = cta?.label || (project.external ? 'View Project' : 'Open Project');
  const external = project.external ?? isExternalHref(href);

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="button-link inline-block text-center"
    >
      {label}
      {external ? ' ↗' : ''}
    </a>
  );
}

export async function generateStaticParams() {
  const projects = await getAllProjectHubs();
  return projects.map(project => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: `${project.title} - The Arcades`,
    description: project.description,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const groupedResources = groupResources(project.resources);
  const relatedPosts = await getPostsBySlugs(project.relatedPostSlugs);

  return (
    <div className="w-full px-4 py-8">
      <article className="austenbox" style={{ margin: '0 auto', marginTop: '5%', marginBottom: '5%' }}>
        <Link href="/projects" className="button-link mb-6 inline-block">
          Back to Projects
        </Link>

        <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <h1 className="gaysparkles mb-3 text-left text-3xl font-bold">{project.title}</h1>
            <p className="m-0 max-w-2xl text-base leading-relaxed text-[var(--fg-muted)]">
              {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.category && (
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                  {categoryLabels[project.category] ?? project.category.replace(/-/g, ' ')}
                </span>
              )}
              {project.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--fg-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            <ProjectCta project={project} />
          </div>
        </header>

        {project.image && (
          <img
            src={project.image}
            alt={project.title}
            className="mt-8 max-h-[420px] w-full rounded-lg object-cover"
          />
        )}

        {Object.keys(groupedResources).length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-left text-2xl font-semibold">Resources</h2>
            <div className="grid gap-6">
              {Object.entries(groupedResources).map(([kind, resources]) => (
                <section key={kind}>
                  <h3 className="mb-3 text-left text-lg font-semibold text-[var(--fg)]">
                    {kindLabels[kind] ?? kindLabels.other}
                  </h3>
                  <div className="grid gap-3">
                    {kind === 'youtube'
                      ? resources.map(resource => {
                          const embedUrl = getYouTubeEmbedUrl(resource.href);
                          return (
                            <div key={`${resource.kind}-${resource.href}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                              <div className="mb-3 font-semibold text-[var(--fg)]">{resource.label}</div>
                              {embedUrl ? (
                                <div className="aspect-video overflow-hidden rounded border border-[var(--border)]">
                                  <iframe
                                    src={embedUrl}
                                    title={resource.label}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <ResourceLink resource={resource} />
                              )}
                              {resource.description && (
                                <p className="m-0 mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                          );
                        })
                      : resources.map(resource => (
                          <ResourceLink
                            key={`${resource.kind}-${resource.href}`}
                            resource={resource}
                          />
                        ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {relatedPosts.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-left text-2xl font-semibold">Related Writing</h2>
            <div className="grid gap-3">
              {relatedPosts.map(post => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--neon-pink)] hover:bg-[var(--surface-hover)]"
                >
                  <span className="block font-semibold text-[var(--fg)]">{post.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--fg-muted)]">
                    {post.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
