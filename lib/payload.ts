import { getPayload, type Payload } from 'payload';
import configPromise from '@payload-config';
import type { SerializedEditorState } from 'lexical';
import type { Group, Media } from '@/payload-types';
import { logger } from '@/lib/logger';
import { publicPostStatusWhere } from '@/lib/post-status';
import { buildGroupIntroUrl } from '@/lib/post-url';
import type { ProjectFormat, ProjectResourceKind } from '@/lib/project-model';
import { slugify } from '@/lib/utils';
import { getBlogSource } from '@/lib/blog';
import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts, type MarkdownGroup } from '@/lib/markdown-posts';

type ProjectPayload = Pick<Payload, 'find'>;

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
  jacketDescription?: SerializedEditorState | null;
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
    relatedPostSlugs: Array.from(new Set([...postSlugs, ...(project.relatedPostSlugs ?? [])])),
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

function normalizeGroup(doc: Group, postSlugsForGroup: string[] = []): ProjectHub {
  const slug = doc.slug || slugify(doc.title);
  const resources = Array.isArray(doc.resources) ? doc.resources : [];
  const href = doc.href || buildGroupIntroUrl(slug);
  const external = Boolean(doc.external);

  let projectCTA: ProjectCTA | undefined;
  if (doc.projectCTA?.href) {
    projectCTA = doc.projectCTA;
  } else if (external) {
    projectCTA = {
      label: 'View Project',
      href,
      type: 'other' as const,
    };
  }

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
    jacketDescription: (doc.jacketDescription as SerializedEditorState | null | undefined) ?? null,
    image: typeof doc.image === 'object' && doc.image !== null ? (doc.image as Media).url : null,
    href,
    external,
    tags: normalizeStringArray(doc.tags),
    featured: Boolean(doc.featured),
    homeHighlight: Boolean(doc.homeHighlight),
    category: doc.category,
    status: doc.status,
    format: doc.format ?? 'serial',
    primaryCTA: projectCTA,
    resources,
    relatedPostSlugs,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
}

async function fetchPostSlugsByGroup(
  payload: ProjectPayload,
  slugs: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (slugs.length === 0) return map;

  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { in: slugs } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    sort: ['order', 'publishedDate'],
    depth: 0,
    pagination: false,
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

export async function loadProjectHubs(payload: ProjectPayload): Promise<ProjectHub[]> {
  const result = await payload.find({
    collection: 'groups',
    depth: 1,
    pagination: false,
  });
  const groups = result.docs;
  if (groups.length === 0) return [];

  const slugs = groups.map(g => g.slug || slugify(g.title)).filter(Boolean);
  const postSlugsByGroup = await fetchPostSlugsByGroup(payload, slugs).catch(
    () => new Map<string, string[]>(),
  );

  return groups
    .map(group => {
      const slug = group.slug || slugify(group.title);
      return normalizeGroup(group, postSlugsByGroup.get(slug) ?? []);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getAllProjectHubs(): Promise<ProjectHub[]> {
  if (getBlogSource() === 'markdown') return getMarkdownProjectHubs();
  try {
    const payload = await getPayloadClient();
    return await loadProjectHubs(payload);
  } catch (error) {
    logger.error({ err: error }, '[getAllProjectHubs] failed to load groups');
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<ProjectHub | null> {
  if (getBlogSource() === 'markdown') {
    return getMarkdownProjectHubs().find((group) => group.slug === slug) ?? null;
  }
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'groups',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    });

    const doc = result.docs[0];
    if (!doc) return null;

    const postSlugsByGroup = await fetchPostSlugsByGroup(payload, [slug]).catch(
      () => new Map<string, string[]>(),
    );
    return normalizeGroup(doc, postSlugsByGroup.get(slug) ?? []);
  } catch (error) {
    logger.error({ err: error, slug }, '[getProjectBySlug] failed to load group');
    return null;
  }
}
