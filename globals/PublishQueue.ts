import type { GlobalConfig } from 'payload';

export const PublishQueue: GlobalConfig = {
  slug: 'publish-queue',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: { hidden: true },
  fields: [
    {
      name: 'fictionQueue',
      type: 'array',
      fields: [
        { name: 'post', type: 'relationship', relationTo: 'posts', required: true },
      ],
    },
    {
      name: 'essaysQueue',
      type: 'array',
      fields: [
        { name: 'post', type: 'relationship', relationTo: 'posts', required: true },
      ],
    },
  ],
};
