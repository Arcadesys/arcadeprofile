import type { CollectionConfig } from 'payload';
import {
  projectCategoryOptions,
  projectCtaTypeOptions,
  projectFormatOptions,
  projectResourceKindOptions,
  projectStatusOptions,
} from '@/lib/project-model';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Groups: CollectionConfig = {
  slug: 'groups',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', 'category', 'featured', 'homeHighlight', 'updatedAt']),
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
