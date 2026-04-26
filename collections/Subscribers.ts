import crypto from 'crypto';
import type { CollectionConfig } from 'payload';
import { authenticatedAccess } from './shared/access';
import { adminGroups } from './shared/admin';

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  access: authenticatedAccess,
  admin: {
    group: adminGroups.audience,
    useAsTitle: 'email',
    defaultColumns: ['email', 'tags', 'unsubscribed', 'subscribedAt'],
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data?.unsubscribeToken) {
          return { ...data, unsubscribeToken: crypto.randomUUID() };
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'select',
          options: [
            { label: 'Fiction', value: 'fiction' },
            { label: 'Tech', value: 'tech' },
            { label: 'Updates', value: 'updates' },
          ],
          required: true,
        },
      ],
    },
    {
      name: 'subscribedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'unsubscribed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.unsubscribed,
      },
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
};
