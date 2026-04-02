import type { CollectionConfig } from 'payload';
import { discoverabilityFields, metaFields } from './fields/discoverability';

export const Demos: CollectionConfig = {
  slug: 'demos',
  access: {
    read: () => true,
  },
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'image', type: 'text' },
    { name: 'embedUrl', type: 'text', required: true },
    { name: 'tags', type: 'json' },
    ...discoverabilityFields,
    ...metaFields,
  ],
};
