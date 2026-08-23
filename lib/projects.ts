import { buildGroupIntroUrl } from '@/lib/post-url';
import type { ProjectFormat, ProjectResourceKind } from '@/lib/project-model';
import {
  loadMarkdownGroups,
  loadMarkdownPosts,
  selectPublicMarkdownPosts,
  type MarkdownGroup,
} from '@/lib/markdown-posts';

export interface ProjectResource {
  label: string;
  href: string;
  kind: ProjectResourceKind;
  description?: string | null;
  external?: boolean | null;
  id?: string | null;
}

export interface ProjectCTA {
  label?: string | null;
  href?: string | null;
  type?: Exclude<ProjectResourceKind, 'post'> | null;
}

export interface ProjectHub {
  id: number | string;
  slug: string;
  title: string;
  description: string;
  jacketMarkdown?: string;
  image?: string | null;
  href: string;
  external?: boolean | null;
  tags: string[];
  featured: boolean;
  homeHighlight: boolean;
  category?: string | null;
  status?: string | null;
  format?: ProjectFormat | null;
  primaryCTA?: ProjectCTA;
  resources: ProjectResource[];
  relatedPostSlugs: string[];
  updatedAt?: string;
  createdAt?: string;
}

const projectResourceKinds = new Set<ProjectResourceKind>([
  'preview', 'buy', 'experiment', 'youtube', 'audio', 'repo', 'download', 'post', 'other',
]);

function markdownProjectHub(group: MarkdownGroup, postSlugs: string[]): ProjectHub {
  const project = group.project ?? {};
  const resources: ProjectResource[] = (project.resources ?? []).map((resource) => ({
    label: resource.label,
    href: resource.href,
    kind: projectResourceKinds.has(resource.kind as ProjectResourceKind)
      ? resource.kind as ProjectResourceKind
      : 'other',
    description: resource.description,
    external: resource.external,
  }));
  const primaryType = project.primaryCTA?.type;
  return {
    id: group.slug,
    slug: group.slug,
    title: group.title,
    description: group.description ?? '',
    jacketMarkdown: group.introMarkdown,
    image: project.image,
    href: project.href ?? buildGroupIntroUrl(group.slug),
    external: project.external ?? false,
    tags: group.tags ?? [],
    featured: project.featured ?? false,
    homeHighlight: project.homeHighlight ?? false,
    category: project.category,
    status: project.status,
    format: project.format ?? 'serial',
    primaryCTA: project.primaryCTA ? {
      label: project.primaryCTA.label,
      href: project.primaryCTA.href,
      type: primaryType && projectResourceKinds.has(primaryType as ProjectResourceKind) && primaryType !== 'post'
        ? primaryType as Exclude<ProjectResourceKind, 'post'>
        : 'other',
    } : undefined,
    resources,
    relatedPostSlugs: [...new Set([...postSlugs, ...(project.relatedPostSlugs ?? [])])],
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
  };
}

function getMarkdownProjectHubs(): ProjectHub[] {
  const groups = loadMarkdownGroups();
  const posts = selectPublicMarkdownPosts(loadMarkdownPosts());
  return groups.map((group) => markdownProjectHub(
    group,
    posts.filter((post) => post.group === group.slug).map((post) => post.slug),
  )).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getAllProjectHubs(): Promise<ProjectHub[]> {
  return getMarkdownProjectHubs();
}

export async function getProjectBySlug(slug: string): Promise<ProjectHub | null> {
  return getMarkdownProjectHubs().find((group) => group.slug === slug) ?? null;
}
