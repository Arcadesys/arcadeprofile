import type { GlobalConfig } from 'payload';
import { isAuthenticated } from './shared/access';
import { adminGroups } from './shared/admin';

export const SocialCredentials: GlobalConfig = {
  slug: 'social-credentials',
  access: {
    read: isAuthenticated,
    update: isAuthenticated,
  },
  admin: {
    group: adminGroups.system,
    description:
      'Credentials used by the auto-poster to publish blog posts to social platforms. Any authenticated CMS user can view and edit these values, so treat the user list as privileged.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Bluesky',
          fields: [
            {
              name: 'bluesky',
              type: 'group',
              fields: [
                {
                  name: 'handle',
                  type: 'text',
                  admin: {
                    description: 'e.g. arcades.bsky.social',
                  },
                },
                {
                  name: 'appPassword',
                  type: 'text',
                  admin: {
                    description:
                      'App password from bsky.app → Settings → App Passwords. Not your main account password.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Facebook',
          fields: [
            {
              name: 'facebook',
              type: 'group',
              fields: [
                {
                  name: 'pageId',
                  type: 'text',
                  admin: {
                    description: 'Numeric Facebook Page ID.',
                  },
                },
                {
                  name: 'pageToken',
                  type: 'text',
                  admin: {
                    description:
                      'Page Access Token with pages_manage_posts and pages_read_engagement scopes.',
                  },
                },
                {
                  name: 'graphVersion',
                  type: 'text',
                  defaultValue: 'v21.0',
                  admin: {
                    description: 'Graph API version. Defaults to v21.0.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Instagram',
          description:
            'Instagram posting reuses the Facebook Page Token configured on the Facebook tab.',
          fields: [
            {
              name: 'instagram',
              type: 'group',
              fields: [
                {
                  name: 'businessAccountId',
                  type: 'text',
                  admin: {
                    description: 'Instagram Business Account ID linked to the Facebook Page.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'LinkedIn',
          fields: [
            {
              name: 'linkedin',
              type: 'group',
              fields: [
                {
                  name: 'accessToken',
                  type: 'text',
                  admin: {
                    description:
                      'OAuth access token with w_member_social (personal) or w_organization_social (org page).',
                  },
                },
                {
                  name: 'authorUrn',
                  type: 'text',
                  admin: {
                    description:
                      'Author URN, e.g. urn:li:person:{member-id} or urn:li:organization:{org-id}.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
