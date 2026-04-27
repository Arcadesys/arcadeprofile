import type { CollectionConfig } from 'payload';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { jsonTagsField } from './fields/tags';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Demos: CollectionConfig = {
  slug: 'demos',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content),
  fields: [
    slugField(),
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'image', type: 'text' },
    { name: 'embedUrl', type: 'text', required: true },
    jsonTagsField,
    ...discoverabilityAndMetaFields,
  ],
};
