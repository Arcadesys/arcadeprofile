import type { CollectionConfig } from 'payload';
import { publicReadAccess } from './shared/access';
import { adminGroups } from './shared/admin';

export const Media: CollectionConfig = {
  slug: 'media',
  access: publicReadAccess,
  upload: {
    staticDir: 'public/media',
    adminThumbnail: 'og',
    imageSizes: [
      {
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 512,
        position: 'centre',
      },
    ],
  },
  admin: {
    group: adminGroups.system,
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Alt text for accessibility.',
      },
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
};
