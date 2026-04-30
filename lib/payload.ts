import { getPayload } from 'payload';
import configPromise from '@payload-config';
import type { Book, Demo, Group } from '@/payload-types';
import { slugify } from '@/lib/utils';

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

function defaultProjectHref(slug: string): string {
  return `/projects/${slug}`;
}

function normalizeGroup(doc: Group, postSlugsForGroup: string[] = []): ProjectHub {
  const slug = doc.slug || slugify(doc.title);
  const resources = Array.isArray(doc.resources) ? doc.resources : [];
  const href = doc.href || defaultProjectHref(slug);
  const external = Boolean(doc.external);

  const projectCTA = doc.projectCTA?.href
    ? doc.projectCTA
    : {
        label: external ? 'View Project' : 'Open Project',
        href,
        type: external ? ('other' as const) : ('experiment' as const),
      };

  const explicitRelated = Array.isArray(doc.relatedPostSlugs)
    ? doc.relatedPostSlugs
        .map(item => item.slug)
        .filter((value): value is string => Boolean(value))
    : [];

  const relatedPostSlugs = Array.from(new Set([...postSlugsForGroup, ...explicitRelated]));

  return {
    id: doc.id,
    slug,
    title: doc.title,
    description: doc.description ?? '',
    image: doc.image,
    href,
    external,
    tags: normalizeStringArray(doc.tags),
    featured: Boolean(doc.featured),
    category: doc.category,
    status: doc.status,
    primaryCTA: projectCTA,
    resources,
    relatedPostSlugs,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
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

async function fetchPostSlugsByGroup(slugs: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (slugs.length === 0) return map;

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    where: { group: { in: slugs } },
    sort: 'order',
    limit: 500,
    depth: 0,
  });

  for (const doc of result.docs) {
    const groupSlug = (doc.group as string | undefined) ?? '';
    const postSlug = (doc.slug as string | undefined) ?? '';
    if (!groupSlug || !postSlug) continue;
    const list = map.get(groupSlug) ?? [];
    list.push(postSlug);
    map.set(groupSlug, list);
  }

  return map;
}

export async function getAllProjectHubs(): Promise<ProjectHub[]> {
  let groups: Group[] = [];
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'groups',
      limit: 200,
      depth: 0,
    });
    groups = result.docs;
  } catch (error) {
    console.error('[getAllProjectHubs] failed to load groups:', error);
    groups = [];
  }

  if (groups.length === 0) return [];

  const slugs = groups.map(g => g.slug || slugify(g.title)).filter(Boolean);
  const postSlugsByGroup = await fetchPostSlugsByGroup(slugs).catch(() => new Map<string, string[]>());

  return groups
    .map(group => {
      const slug = group.slug || slugify(group.title);
      return normalizeGroup(group, postSlugsByGroup.get(slug) ?? []);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getProjectBySlug(slug: string): Promise<ProjectHub | null> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'groups',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });

    const doc = result.docs[0];
    if (!doc) return null;

    const postSlugsByGroup = await fetchPostSlugsByGroup([slug]).catch(
      () => new Map<string, string[]>(),
    );
    return normalizeGroup(doc, postSlugsByGroup.get(slug) ?? []);
  } catch (error) {
    console.error('[getProjectBySlug] failed to load group:', slug, error);
    return null;
  }
}
