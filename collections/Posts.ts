import type { CollectionConfig } from 'payload';

import type { Post } from '../payload-types';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { buildPostUrl, computePostPartIndex } from '../lib/post-url';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { promoteScheduledDraftHook } from './hooks/promoteScheduledDraft';
import { revalidatePathsFor } from './hooks/revalidate';
import { isAuthenticated, publicReadAccess } from './shared/access';
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
    ...publicReadAccess,
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
        // On the first transition into a public state, fan out to (1) the
        // ActiveCampaign newsletter and (2) the social platforms. Public
        // states are 'published' and 'sent'. Both branches share a single
        // populated doc fetch — afterChange's `doc` reflects the triggering
        // op's depth (often 0), which leaves `meta.image` as a bare id; the
        // newsletter renderer needs the populated Media upload, and the
        // Instagram social client needs its url. Per-branch try/catch so a
        // newsletter failure doesn't block social, and vice versa. Neither
        // branch fails the save.
        const wasPublic =
          previousDoc?.publish_status === 'published' ||
          previousDoc?.publish_status === 'sent';
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';
        if (!isNowPublic || wasPublic) return;

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
            '[publish-hooks] Failed to load populated post; skipping newsletter and social fan-out:',
            err instanceof Error ? err.message : err,
          );
          return;
        }

        if (!doc.newsletterSent) {
          try {
            const { sendBlogPostNewsletter } = await import('../lib/activecampaign');
            const { resolveGroupHeroForPost } = await import('../lib/post-newsletter');
            const subject = (doc.newsletterHeading as string) || (doc.title as string);

            const group = await resolveGroupHeroForPost(req.payload, populated);

            const { htmlBody, textBody } = buildPostNewsletterContent({
              ...populated,
              group,
            });

            let scheduledSendAt: Date | undefined;
            const publishedRaw = doc.publishedDate;
            if (typeof publishedRaw === 'string' && publishedRaw) {
              const t = new Date(publishedRaw);
              if (!Number.isNaN(t.getTime())) {
                scheduledSendAt = t;
              }
            }

            const result = await sendBlogPostNewsletter({
              subject,
              htmlBody,
              textBody,
              slug: doc.slug as string,
              scheduledSendAt,
            });

            await req.payload.update({
              collection: 'posts',
              id: doc.id as number,
              data: {
                newsletterSent: true,
                publish_status: 'sent',
              },
            });

            console.log(
              `[newsletter] ActiveCampaign campaign sent for post "${doc.title}"`,
              JSON.stringify({
                postId: doc.id,
                slug: doc.slug,
                acMessageId: result.messageId,
                acCampaignId: result.campaignId,
              }),
            );
          } catch (err) {
            const detail = (err as any)?.details;
            const status = (err as any)?.causeStatus;
            console.error(
              '[newsletter] Failed to send campaign:',
              err instanceof Error ? err.message : err,
              ...(status !== undefined ? [`(HTTP ${status})`] : []),
              ...(detail ? [`| AC detail: ${detail}`] : []),
            );
          }
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
      name: 'newsletterPreview',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/admin/SendNewsletterPreview',
        },
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
