import type { CollectionConfig } from 'payload';
import { discoverabilityFields } from './fields/discoverability';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Books: CollectionConfig = {
  slug: 'books',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.library),
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
