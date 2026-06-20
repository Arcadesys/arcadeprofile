import type { CollectionConfig } from 'payload';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import type { RevalidationDoc } from './hooks/revalidate';
import { revalidateDeletedPathsFor, revalidatePathsFor } from './hooks/revalidate';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

function addPageRevalidationPath(paths: Set<string>, doc?: RevalidationDoc): void {
  const slug = doc?.slug as string | undefined;
  if (!slug) return;
  paths.add(`/${slug}`);
}

export function buildPageRevalidationPaths(
  doc: RevalidationDoc,
  previousDoc?: RevalidationDoc,
): string[] {
  const paths = new Set<string>();
  addPageRevalidationPath(paths, doc);
  addPageRevalidationPath(paths, previousDoc);
  return Array.from(paths);
}

const revalidatePagePaths = revalidatePathsFor((doc, _payload, previousDoc) =>
  buildPageRevalidationPaths(doc, previousDoc),
);
const revalidateDeletedPagePaths = revalidateDeletedPathsFor((doc) =>
  buildPageRevalidationPaths(doc),
);

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', '_status', 'updatedAt']),
  hooks: {
    afterChange: [revalidatePagePaths],
    afterDelete: [revalidateDeletedPagePaths],
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short description for search and social cards.',
      },
    },
    {
      name: 'intro_label',
      type: 'text',
      admin: {
        description: 'Label shown above the intro box (e.g. "A note before we begin:")',
      },
    },
    {
      name: 'intro',
      type: 'richText',
      admin: {
        description: 'Optional intro box shown before main content.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'outro',
      type: 'richText',
      admin: {
        description: 'Optional closing section shown after main content.',
      },
    },
    {
      name: 'byline',
      type: 'text',
      admin: {
        description: 'Attribution line shown at the bottom of the outro box (e.g. "Kai, content writer for the Arcades")',
      },
    },
    {
      name: 'footer_text',
      type: 'text',
      admin: {
        description: 'Footer copy (e.g. copyright notice)',
      },
    },
    {
      name: 'footer_link_label',
      type: 'text',
    },
    {
      name: 'footer_link_href',
      type: 'text',
    },
    ...discoverabilityAndMetaFields,
  ],
};
