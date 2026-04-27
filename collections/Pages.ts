import type { CollectionConfig } from 'payload';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { revalidatePathsFor } from './hooks/revalidate';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', '_status', 'updatedAt']),
  hooks: {
    afterChange: [revalidatePathsFor((doc) => [`/${doc.slug}`])],
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
