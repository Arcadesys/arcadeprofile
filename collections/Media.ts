import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
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
