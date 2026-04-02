import type { CollectionConfig } from 'payload';
import { discoverabilityFields } from './fields/discoverability';

export const Books: CollectionConfig = {
  slug: 'books',
  access: {
    read: () => true,
  },
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'coverImage', type: 'text' },
    { name: 'buyLink', type: 'text' },
    { name: 'hasBuyButton', type: 'checkbox', defaultValue: false },
    { name: 'hasPreview', type: 'checkbox', defaultValue: false },
    ...discoverabilityFields,
  ],
};
