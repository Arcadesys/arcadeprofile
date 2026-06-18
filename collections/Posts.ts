import type { CollectionConfig } from 'payload';

import { buildPostUrl } from '../lib/post-url';
import { buildPreviewUrl } from '../lib/preview-token';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { ensurePreviewTokenHook } from './hooks/ensurePreviewToken';
import { promoteScheduledDraftHook } from './hooks/promoteScheduledDraft';
import { revalidatePathsFor } from './hooks/revalidate';
import { validateScheduledPublishDateHook } from './hooks/validateScheduledPublishDate';
import { isAuthenticated } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

const revalidatePostPaths = revalidatePathsFor(async (doc) => {
  const slug = doc.slug as string | undefined;
  const group = doc.group as string | undefined;
  const paths = ['/latest', '/writing', '/samples', '/feed.xml'];

  if (group) {
    paths.push(`/writing/group/${group}`, `/${group}`, `/projects/${group}`, `/projects/${group}/00`);
    if (slug) {
      paths.push(buildPostUrl(group, slug));
    }
  }

  return paths;
});

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    // Anonymous reads through /api/posts are scoped to public-facing posts
    // only. The renderer (lib/blog.ts) already filters by publish_status
    // explicitly, but the bare REST endpoint previously returned drafts and
    // scheduled posts to unauthenticated callers. Authenticated CMS users
    // (and server-side calls with overrideAccess) still see everything.
    read: ({ req }) => {
      if (req.user) return true;
      return { publish_status: { in: ['published', 'sent'] } };
    },
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  admin: {
    ...titledAdmin(adminGroups.publishing, [
      'title',
      'publish_status',
      'scheduledPublishDate',
      'publishedDate',
      'showInSamples',
      'sampleOrder',
      'suppressNewsletter',
    ]),
    // Renders Payload's built-in "Preview" button in the document controls
    // (top-right, next to Save). Editors click it to open the preview URL
    // in a new tab — same URL surfaced in the sidebar field and list cell.
    preview: (doc) => buildPreviewUrl(doc.previewToken),
  },
  hooks: {
    beforeChange: [
      validateScheduledPublishDateHook,
      promoteScheduledDraftHook,
      ensurePreviewTokenHook,
    ],
    afterChange: [revalidatePostPaths],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'publishedDate',
      label: 'Public Date',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Date shown publicly and used for sorting published posts.',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'suppressNewsletter',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'When true, scheduled publishing will not send a per-post newsletter.',
      },
    },
    {
      name: 'newsletterSend',
      type: 'group',
      admin: {
        position: 'sidebar',
        description:
          'Postmark newsletter delivery state. Read-only — written by the scheduled publish job.',
      },
      fields: [
        {
          name: 'messageId',
          type: 'textarea',
          admin: { readOnly: true, description: 'Comma-separated Postmark message ids.' },
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Skipped', value: 'skipped' },
          ],
          admin: { readOnly: true },
        },
        {
          name: 'targetedLists',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Comma-separated ActiveCampaign list ids used to resolve recipients.',
          },
        },
        {
          name: 'recipientCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of deduplicated recipients resolved from ActiveCampaign.',
          },
        },
        {
          name: 'acceptedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of recipients accepted by Postmark.',
          },
        },
        {
          name: 'failedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of recipient-level Postmark API failures on the latest send attempt.',
          },
        },
        {
          name: 'deliveredCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of accepted messages confirmed delivered by Postmark webhooks.',
          },
        },
        {
          name: 'bouncedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of accepted messages that later bounced.',
          },
        },
        {
          name: 'openedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of accepted messages with an open event when open tracking is enabled.',
          },
        },
        {
          name: 'clickedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of accepted messages with a click event when link tracking is enabled.',
          },
        },
        {
          name: 'complainedCount',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Number of accepted messages with a spam complaint.',
          },
        },
        {
          name: 'sentAt',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'lastSyncedAt',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'lastEventAt',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Most recent Postmark event timestamp for this post.',
          },
        },
        {
          name: 'lastError',
          type: 'textarea',
          admin: {
            readOnly: true,
            description:
              'Most recent newsletter delivery error. Cleared on successful send.',
          },
        },
      ],
    },
    {
      name: 'scheduledPublishDate',
      label: 'Scheduled Publish Date',
      type: 'date',
      defaultValue: () => {
        const d = new Date();
        d.setUTCHours(10, 0, 0, 0); // 05:00 CDT
        if (d <= new Date()) d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString();
      },
      admin: {
        position: 'sidebar',
        description: 'When a draft should be promoted to published by the scheduler.',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'previewUrl',
      type: 'text',
      virtual: true,
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/PreviewUrlField#default',
        },
      },
    },
    {
      name: 'group',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Group/series slug (e.g. "the-singularity-log")',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Order within group (lower = first)',
      },
    },
    {
      name: 'chapter',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Chapter slug within the group (matches a chapter defined on the group)',
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Austen Tucker',
    },
    tagArrayField,
    {
      name: 'newsletterHeading',
      type: 'text',
      admin: {
        description: 'Optional heading for inline newsletter CTA on this post',
      },
    },
    {
      name: 'newsletterDescription',
      type: 'textarea',
      admin: {
        description: 'Optional description for inline newsletter CTA on this post',
      },
    },
    {
      name: 'publish_status',
      label: 'Workflow Status',
      type: 'select',
      options: [
        { label: 'Not queued', value: 'draft' },
        { label: 'Scheduled publish', value: 'scheduled' },
        { label: 'Published by scheduler', value: 'published' },
        { label: 'Newsletter sent', value: 'sent' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
        description:
          'Internal scheduling/newsletter workflow. Payload draft/published state lives in Status.',
      },
    },
    {
      name: 'previewToken',
      label: 'Preview token',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        // The `previewUrl` virtual field above renders the full URL with a
        // Copy button — that's the primary editor affordance. This raw token
        // is kept as a collapsed sidebar field for transparency and so it
        // can drive the list-view Cell. `disableListColumn: false` is the
        // default; the Cell registration below makes the column useful when
        // toggled on via Payload's column picker.
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-generated. Stable across edits so shared preview links keep working.',
        components: {
          Cell: '@/components/admin/PreviewUrlCell#default',
        },
      },
    },
    {
      type: 'collapsible',
      label: 'Samples',
      admin: {
        description: 'Controls whether this post appears in the public Samples funnel.',
      },
      fields: [
        {
          name: 'showInSamples',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Show this published post on /samples.',
          },
        },
        {
          name: 'sampleOrder',
          type: 'number',
          admin: {
            description: 'Lower numbers appear first. Posts without a value fall back to publish date.',
          },
        },
        {
          name: 'sampleLabel',
          type: 'text',
          admin: {
            description: 'Optional button text for /samples.',
            placeholder: 'Read Sample',
          },
        },
      ],
    },
    ...discoverabilityAndMetaFields,
  ],
};
