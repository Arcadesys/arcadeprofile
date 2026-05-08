import type { CollectionConfig } from 'payload';

import type { Post } from '../payload-types';
import { buildPostUrl, computePostPartIndex } from '../lib/post-url';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { promoteScheduledDraftHook } from './hooks/promoteScheduledDraft';
import { revalidatePathsFor } from './hooks/revalidate';
import { isAuthenticated } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

const revalidatePostPaths = revalidatePathsFor(async (doc, payload) => {
  const slug = doc.slug as string | undefined;
  const group = doc.group as string | undefined;
  const paths = ['/latest', '/writing', '/samples', '/feed.xml'];

  if (group) {
    paths.push(`/writing/group/${group}`, `/${group}`, `/projects/${group}`, `/projects/${group}/00`);
    // Part number is the post's 1-based position in the sorted group, NOT the
    // raw `order` field — non-sequential orders (10, 20, ...) would otherwise
    // revalidate the wrong URL and leave the actual page stale.
    if (slug) {
      const partIndex = await computePostPartIndex(payload, slug, group);
      if (partIndex !== null) paths.push(buildPostUrl(group, partIndex));
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
      'newsletterSent',
    ]),
  },
  hooks: {
    beforeChange: [promoteScheduledDraftHook],
    afterChange: [
      revalidatePostPaths,
      async ({ doc, previousDoc, req }) => {
        // On first transition to public ('published' or 'sent'), fan out to
        // social platforms. Newsletter delivery is no longer per-post: the
        // weekly roundup cron (app/(frontend)/api/posts/weekly-roundup) sends
        // a Sunday digest to Fiction and Essays subscribers separately.
        const wasPublic =
          previousDoc?.publish_status === 'published' ||
          previousDoc?.publish_status === 'sent';
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';

        const needsSocial = isNowPublic && !wasPublic;

        if (!needsSocial) return;

        let populated: Post;
        try {
          populated = (await req.payload.findByID({
            collection: 'posts',
            id: doc.id as number,
            depth: 1,
            overrideAccess: true,
          })) as Post;
        } catch (err) {
          console.error(
            '[publish-hooks] Failed to load populated post; skipping social fan-out:',
            err instanceof Error ? err.message : err,
          );
          return;
        }

        try {
          const { autoPostToSocial } = await import('../lib/social');
          const results = await autoPostToSocial(req.payload, populated);
          console.log(
            `[social] Fan-out complete for "${doc.title}":`,
            JSON.stringify(results),
          );
        } catch (err) {
          console.error(
            '[social] Fan-out failed:',
            err instanceof Error ? err.message : err,
          );
        }
      },
    ],
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
      name: 'newsletterSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Whether this post has been sent to newsletter subscribers',
      },
    },
    {
      name: 'scheduledPublishDate',
      label: 'Scheduled Publish Date',
      type: 'date',
      defaultValue: () => {
        const d = new Date();
        d.setUTCHours(13, 0, 0, 0); // 08:00 CDT
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
