import { getPayload } from 'payload';
import configPromise from '@payload-config';
import type { Book, Demo, Project } from '@/payload-types';
import { projects as staticProjects } from '@/data/projects';

export type ProjectResourceKind =
  | 'post'
  | 'preview'
  | 'buy'
  | 'youtube'
  | 'audio'
  | 'experiment'
  | 'repo'
  | 'download'
  | 'other';

export interface ProjectResource {
  label: string;
  href: string;
  kind: ProjectResourceKind;
  description?: string;
  external?: boolean;
  id?: string | null;
}

export interface ProjectCTA {
  label?: string | null;
  href?: string | null;
  type?: Exclude<ProjectResourceKind, 'post'> | null;
}

export interface ProjectHub {
  id: number;
  slug: string;
  title: string;
  description: string;
  image?: string | null;
  href: string;
  external?: boolean | null;
  tags: string[];
  featured: boolean;
  category?: string | null;
  status?: string | null;
  primaryCTA?: ProjectCTA;
  resources: ProjectResource[];
  relatedPostSlugs: string[];
  updatedAt?: string;
  createdAt?: string;
}

async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'tag' in item) {
        return String((item as { tag?: unknown }).tag ?? '');
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeProject(doc: Project): ProjectHub {
  const raw = doc as Project & {
    slug?: string | null;
    featured?: boolean | null;
    category?: string | null;
    status?: string | null;
    primaryCTA?: ProjectCTA;
    resources?: ProjectResource[] | null;
    relatedPostSlugs?: { slug?: string | null }[] | null;
  };
  const resources = Array.isArray(raw.resources) ? raw.resources : [];
  const primaryCTA = raw.primaryCTA?.href
    ? raw.primaryCTA
    : {
        label: raw.external ? 'View Project' : 'Open Project',
        href: raw.href,
        type: raw.external ? 'other' as const : 'experiment' as const,
      };

  return {
    id: raw.id,
    slug: raw.slug || slugify(raw.title),
    title: raw.title,
    description: raw.description,
    image: raw.image,
    href: raw.href,
    external: raw.external,
    tags: normalizeStringArray(raw.tags),
    featured: Boolean(raw.featured),
    category: raw.category,
    status: raw.status,
    primaryCTA,
    resources,
    relatedPostSlugs: Array.isArray(raw.relatedPostSlugs)
      ? raw.relatedPostSlugs.map(item => item.slug).filter((slug): slug is string => Boolean(slug))
      : [],
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
  };
}

function normalizeStaticProject(project: (typeof staticProjects)[number], index: number): ProjectHub {
  return {
    id: -(index + 1),
    slug: project.slug || slugify(project.title),
    title: project.title,
    description: project.description,
    image: project.image,
    href: project.href,
    external: project.external,
    tags: project.tags || [],
    featured: Boolean(project.featured),
    category: project.category,
    status: project.status || 'active',
    primaryCTA: project.primaryCTA || {
      label: project.external ? 'View Project' : 'Open Project',
      href: project.href,
      type: project.external ? 'other' : 'experiment',
    },
    resources: project.resources || [],
    relatedPostSlugs: project.relatedPostSlugs || [],
    updatedAt: undefined,
    createdAt: undefined,
  };
}

function getStaticProjectHubs(): ProjectHub[] {
  return staticProjects.map(normalizeStaticProject);
}

export async function getAllBooks(): Promise<Book[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'books',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}

export async function getAllDemos(): Promise<Demo[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'demos',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}

export async function getDemoBySlug(slug: string): Promise<Demo | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'demos',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  return result.docs[0] ?? null;
}

export async function getAllProjects(): Promise<Project[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'projects',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}

export async function getAllProjectHubs(): Promise<ProjectHub[]> {
  let projects: Project[] = [];
  try {
    projects = await getAllProjects();
  } catch {
    projects = [];
  }
  const projectHubs = projects.length > 0
    ? projects.map(normalizeProject)
    : getStaticProjectHubs();
  return projectHubs.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getFeaturedProjectHubs(): Promise<ProjectHub[]> {
  const projects = await getAllProjectHubs();
  const featured = projects.filter(project => project.featured).slice(0, 5);
  return featured.length > 0 ? featured : projects.slice(0, 5);
}

export async function getProjectBySlug(slug: string): Promise<ProjectHub | null> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'projects',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });

    if (result.docs[0]) {
      return normalizeProject(result.docs[0]);
    }
  } catch {
    // Fall through to the normalized static/legacy lookup.
  }

  const projects = await getAllProjectHubs();
  return projects.find(project => project.slug === slug) ?? null;
}
