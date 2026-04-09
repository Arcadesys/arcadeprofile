import type { CollectionConfig } from 'payload';

export const SocialPosts: CollectionConfig = {
  slug: 'social-posts',
  access: {
    read: ({ req }) => !!req.user,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['platform', 'status', 'text', 'scheduledAt', 'postedAt'],
  },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [{ label: 'Bluesky', value: 'bluesky' }],
    },
    {
      name: 'variant',
      type: 'select',
      required: true,
      defaultValue: 'custom',
      options: [
        { label: 'Short', value: 'short' },
        { label: 'Long', value: 'long' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Blog post slug this social post promotes (optional)',
      },
    },
    {
      name: 'linkUrl',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Posted', value: 'posted' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'scheduledAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'postedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'cancelled',
      },
    },
    {
      name: 'failedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'failed',
      },
    },
    {
      name: 'failureReason',
      type: 'text',
      admin: {
        condition: (data) => data?.status === 'failed',
      },
    },
    {
      name: 'postUri',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'AT Protocol URI',
      },
    },
    {
      name: 'postUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Web URL to live post',
      },
    },
  ],
};
