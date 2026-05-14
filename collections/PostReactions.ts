import type { CollectionConfig } from 'payload';

import { REACTION_EMOJIS } from '../lib/reactions';
import { authenticatedAccess } from './shared/access';
import { adminGroups } from './shared/admin';

/**
 * One row per (post, emoji, clientId) reaction. Anonymous readers POST to
 * /api/posts/[id]/reactions which uses overrideAccess; this collection's
 * declared access is admin-only so the auto-mounted Payload REST endpoints
 * remain locked down. The DB-level unique index on (post_id, emoji,
 * client_id) is in the accompanying migration.
 */
export const PostReactions: CollectionConfig = {
  slug: 'post-reactions',
  access: authenticatedAccess,
  admin: {
    group: adminGroups.audience,
    useAsTitle: 'emoji',
    defaultColumns: ['emoji', 'post', 'clientId', 'createdAt'],
    description: 'Anonymous reader reactions on posts. One row per (post, emoji, clientId).',
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      index: true,
    },
    {
      name: 'emoji',
      type: 'text',
      required: true,
      validate: (value: unknown) => {
        if (typeof value !== 'string') return 'Emoji is required.';
        if (!(REACTION_EMOJIS as readonly string[]).includes(value)) {
          return `Emoji must be one of: ${REACTION_EMOJIS.join(' ')}`;
        }
        return true;
      },
    },
    {
      name: 'clientId',
      type: 'text',
      required: true,
      index: true,
    },
  ],
  timestamps: true,
};
