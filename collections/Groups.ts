import type { CollectionConfig } from 'payload';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Groups: CollectionConfig = {
  slug: 'groups',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', 'category', 'featured', 'updatedAt']),
  fields: [
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
    { name: 'image', type: 'text' },
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
      name: 'category',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      options: [
        { label: 'Fiction', value: 'fiction' },
        { label: 'Tools', value: 'tools' },
        { label: 'Experiments', value: 'experiments' },
        { label: 'Audio/Video', value: 'audio-video' },
        { label: 'Community', value: 'community' },
        { label: 'Writing', value: 'writing' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Available', value: 'available' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Archived', value: 'archived' },
      ],
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
          options: [
            { label: 'Sample', value: 'preview' },
            { label: 'Buy', value: 'buy' },
            { label: 'Experiment', value: 'experiment' },
            { label: 'Video', value: 'youtube' },
            { label: 'Audio', value: 'audio' },
            { label: 'Repository', value: 'repo' },
            { label: 'Download', value: 'download' },
            { label: 'Other', value: 'other' },
          ],
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
          options: [
            { label: 'Post', value: 'post' },
            { label: 'Sample', value: 'preview' },
            { label: 'Buy', value: 'buy' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Audio', value: 'audio' },
            { label: 'Experiment', value: 'experiment' },
            { label: 'Repository', value: 'repo' },
            { label: 'Download', value: 'download' },
            { label: 'Other', value: 'other' },
          ],
        },
        { name: 'description', type: 'textarea' },
        { name: 'external', type: 'checkbox', defaultValue: false },
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
