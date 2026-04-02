import type { CollectionConfig } from 'payload';
import { discoverabilityFields } from './fields/discoverability';

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: {
    read: () => true,
  },
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'image', type: 'text' },
    { name: 'href', type: 'text', required: true },
    { name: 'external', type: 'checkbox', defaultValue: false },
    { name: 'tags', type: 'json' },
    ...discoverabilityFields,
  ],
};
