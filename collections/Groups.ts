import type { CollectionConfig, Payload } from 'payload';
import {
  projectCategoryOptions,
  projectCtaTypeOptions,
  projectFormatOptions,
  projectResourceKindOptions,
  projectStatusOptions,
} from '@/lib/project-model';
import { publicPostStatusWhere } from '@/lib/post-status';
import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import type { RevalidationDoc } from './hooks/revalidate';
import { revalidateDeletedPathsFor, revalidatePathsFor } from './hooks/revalidate';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

type GroupRevalidationPayload = Pick<Payload, 'find'>;

function getGroupRevalidationSlug(doc?: RevalidationDoc): string | null {
  const slug = doc?.slug;
  return typeof slug === 'string' && slug.length > 0 ? slug : null;
}

function isString(value: string | null): value is string {
  return value !== null;
}

function groupRevalidationSlugs(
  doc: RevalidationDoc,
  previousDoc?: RevalidationDoc,
): string[] {
  return Array.from(
    new Set([getGroupRevalidationSlug(doc), getGroupRevalidationSlug(previousDoc)].filter(isString)),
  );
}

export async function loadGroupPostSlugsForRevalidation(
  payload: GroupRevalidationPayload,
  groupSlugs: string[],
): Promise<Map<string, string[]>> {
  const slugs = Array.from(new Set(groupSlugs.filter(Boolean)));
  const postSlugsByGroup = new Map<string, string[]>();
  if (slugs.length === 0) return postSlugsByGroup;

  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { group: { in: slugs } },
        { publish_status: publicPostStatusWhere() },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });

  for (const post of result.docs) {
    const group = post.group as string | undefined;
    const slug = post.slug as string | undefined;
    if (!group || !slug) continue;
    const postSlugs = postSlugsByGroup.get(group) ?? [];
    postSlugs.push(slug);
    postSlugsByGroup.set(group, postSlugs);
  }

  return postSlugsByGroup;
}

export function buildGroupRevalidationPaths(
  doc: RevalidationDoc,
  previousDoc?: RevalidationDoc,
  postSlugsByGroup: Map<string, string[]> = new Map(),
): string[] {
  const paths = new Set(['/', '/latest', '/projects', '/feed.xml', '/sitemap.xml']);

  for (const groupSlug of groupRevalidationSlugs(doc, previousDoc)) {
    paths.add(buildGroupIntroUrl(groupSlug));
    for (const postSlug of postSlugsByGroup.get(groupSlug) ?? []) {
      paths.add(buildPostUrl(groupSlug, postSlug));
    }
  }

  return Array.from(paths);
}

async function buildGroupRevalidationPathsWithPosts(
  payload: GroupRevalidationPayload,
  doc: RevalidationDoc,
  previousDoc?: RevalidationDoc,
): Promise<string[]> {
  const slugs = groupRevalidationSlugs(doc, previousDoc);
  const postSlugsByGroup = await loadGroupPostSlugsForRevalidation(payload, slugs);
  return buildGroupRevalidationPaths(doc, previousDoc, postSlugsByGroup);
}

const revalidateGroupPaths = revalidatePathsFor(async (doc, payload, previousDoc) =>
  buildGroupRevalidationPathsWithPosts(payload, doc, previousDoc),
);
const revalidateDeletedGroupPaths = revalidateDeletedPathsFor(async (doc, payload) =>
  buildGroupRevalidationPathsWithPosts(payload, doc),
);

export const Groups: CollectionConfig = {
  slug: 'groups',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', 'category', 'featured', 'homeHighlight', 'updatedAt']),
  hooks: {
    afterChange: [revalidateGroupPaths],
    afterDelete: [revalidateDeletedGroupPaths],
  },
  fields: [
    {
      name: 'arrangeScenesLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/ArrangeScenesLink#default',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('Stable group/project URL slug.'),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'jacketDescription',
      type: 'richText',
      admin: {
        description: 'Jacket-copy blurb shown on the intro page — a short, punchy pitch for the project.',
      },
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'href', type: 'text' },
    {
      name: 'external',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether `href` points off-site.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Feature this group in the main navigation panel.',
      },
    },
    {
      name: 'homeHighlight',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Show this group in the "Current projects" section on the home page.',
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      options: [...projectCategoryOptions],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
      options: [...projectStatusOptions],
    },
    {
      name: 'format',
      type: 'select',
      defaultValue: 'serial',
      admin: {
        position: 'sidebar',
        description:
          'Serial: posts read in order (chapters). Collection: independent pieces (e.g. short stories) — the intro page shows a picker instead of a "Start reading" button.',
      },
      options: [...projectFormatOptions],
    },
    tagArrayField,
    {
      name: 'projectCTA',
      type: 'group',
      admin: {
        description: 'Primary call-to-action for the project hub page.',
      },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
        {
          name: 'type',
          type: 'select',
          options: [...projectCtaTypeOptions],
        },
      ],
    },
    {
      name: 'resources',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        {
          name: 'kind',
          type: 'select',
          required: true,
          options: [...projectResourceKindOptions],
        },
        { name: 'description', type: 'textarea' },
        { name: 'external', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'chapters',
      type: 'array',
      admin: {
        description: 'Optional chapter groupings. Posts can reference a chapter slug to appear under that section in the doc drawer.',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'slug',
          type: 'text',
          required: true,
          admin: { description: 'Unique slug within this group, referenced by the post Chapter field.' },
        },
      ],
    },
    {
      name: 'relatedPostSlugs',
      type: 'array',
      admin: {
        description: 'Extra blog post slugs to surface beyond posts whose `group` field already matches this slug.',
      },
      fields: [
        { name: 'slug', type: 'text', required: true },
      ],
    },
    ...discoverabilityAndMetaFields,
  ],
};
