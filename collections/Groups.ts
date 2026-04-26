import type { CollectionConfig } from 'payload';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

export const Groups: CollectionConfig = {
  slug: 'groups',
  access: publicReadAccess,
  admin: titledAdmin(adminGroups.content, ['title', 'slug', 'updatedAt']),
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField(),
    {
      name: 'description',
      type: 'textarea',
    },
    tagArrayField,
    ...discoverabilityAndMetaFields,
  ],
};
