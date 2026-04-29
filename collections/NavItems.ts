import type { CollectionConfig } from 'payload';
import { publicReadAccess } from './shared/access';
import { adminGroups } from './shared/admin';

export const NavItems: CollectionConfig = {
  slug: 'nav-items',
  access: publicReadAccess,
  admin: {
    group: adminGroups.system,
    useAsTitle: 'label',
    defaultColumns: ['label', 'href', 'order', 'visible', 'isPrimary'],
    description: 'Navigation bar items — control label, route, order, visibility, and which item gets the primary (highlighted) treatment.',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'href',
      type: 'text',
      required: true,
      admin: {
        description: 'Route or URL (e.g. /projects or https://store.example.com)',
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 10,
      admin: {
        description: 'Lower numbers appear first.',
      },
    },
    {
      name: 'visible',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Uncheck to hide this item without deleting it.',
      },
    },
    {
      name: 'isPrimary',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Gives this item the highlighted (glowing border) primary treatment.',
      },
    },
  ],
};
