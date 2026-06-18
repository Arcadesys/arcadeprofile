import type { CollectionConfig } from 'payload';

import { authenticatedAccess } from './shared/access';
import { adminGroups } from './shared/admin';

export const POSTMARK_EVENT_TYPES = [
  'submitted',
  'delivery',
  'bounce',
  'open',
  'click',
  'spam_complaint',
  'subscription_change',
  'smtp_api_error',
  'other',
] as const;

export const PostmarkEvents: CollectionConfig = {
  slug: 'postmark-events',
  access: authenticatedAccess,
  admin: {
    group: adminGroups.audience,
    useAsTitle: 'messageId',
    defaultColumns: ['eventType', 'post', 'recipientEmail', 'occurredAt', 'messageStream'],
    description:
      'Postmark delivery audit trail. Created from send responses and Postmark webhooks.',
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      index: true,
      admin: {
        description: 'Resolved from Postmark metadata or the original submitted message.',
      },
    },
    {
      name: 'messageId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      index: true,
      options: POSTMARK_EVENT_TYPES.map((value) => ({
        label: value.replace(/_/g, ' '),
        value,
      })),
    },
    {
      name: 'recipientEmail',
      type: 'text',
      index: true,
      admin: {
        description: 'Recipient address from Postmark. Admin-only for support lookups.',
      },
    },
    {
      name: 'tag',
      type: 'text',
      admin: {
        description: 'Postmark Tag value sent with the message or received in the webhook.',
      },
    },
    {
      name: 'messageStream',
      type: 'text',
      admin: {
        description: 'Postmark message stream, e.g. broadcast or outbound.',
      },
    },
    {
      name: 'occurredAt',
      type: 'date',
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'details',
      type: 'textarea',
      admin: {
        description: 'Provider response text, bounce details, delivery details, or error message.',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Custom Postmark metadata attached to the email.',
      },
    },
    {
      name: 'raw',
      type: 'json',
      admin: {
        description: 'Raw Postmark event payload for debugging.',
      },
    },
  ],
  timestamps: true,
};
