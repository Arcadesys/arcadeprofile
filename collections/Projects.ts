import type { CollectionConfig } from 'payload';
import { discoverabilityFields } from './fields/discoverability';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: {
    read: () => true,
  },
  admin: { useAsTitle: 'title' },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Stable project URL slug.',
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.title) {
              return slugify(String(siblingData.title));
            }
            return value;
          },
        ],
      },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'image', type: 'text' },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Feature this project in the main navigation panel.',
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
    { name: 'href', type: 'text', required: true },
    { name: 'external', type: 'checkbox', defaultValue: false },
    { name: 'tags', type: 'json' },
    {
      name: 'primaryCTA',
      type: 'group',
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
        description: 'Blog post slugs to surface on the project hub page.',
      },
      fields: [
        { name: 'slug', type: 'text', required: true },
      ],
    },
    ...discoverabilityFields,
  ],
};
