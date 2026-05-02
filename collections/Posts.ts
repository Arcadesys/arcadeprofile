import type { CollectionConfig } from 'payload';

import type { Post } from '../payload-types';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { discoverabilityAndMetaFields } from './fields/discoverability';
import { slugField } from './fields/slug';
import { tagArrayField } from './fields/tags';
import { revalidatePathsFor } from './hooks/revalidate';
import { publicReadAccess } from './shared/access';
import { adminGroups, titledAdmin } from './shared/admin';

const revalidatePostPaths = revalidatePathsFor((doc) => {
  const slug = doc.slug as string;
  const group = doc.group as string | undefined;
  const paths = ['/blog', '/writing', '/samples', '/feed.xml', `/blog/${slug}`];

  if (group) {
    paths.push(`/writing/group/${group}`, `/${group}`);
  }

  return paths;
});

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: publicReadAccess,
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
    afterChange: [
      revalidatePostPaths,
      async ({ doc, previousDoc, req }) => {
        // Send newsletter when a post first transitions into a public state
        // and newsletterSent is false. Public states are 'published' and 'sent'.
        const wasPublic =
          previousDoc?.publish_status === 'published' ||
          previousDoc?.publish_status === 'sent';
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';
        const wasPublished = !wasPublic;
        const isNowPublished = isNowPublic;
        const notYetSent = !doc.newsletterSent;

        if (isNowPublished && wasPublished && notYetSent) {
          try {
            const { sendBlogPostNewsletter } = await import('../lib/activecampaign');
            const subject = (doc.newsletterHeading as string) || (doc.title as string);

            // Look up the group so the email can fall back to its image when
            // the post has no populated meta.image of its own.
            let group: { image?: string | null; title?: string | null } | null = null;
            const groupSlug = typeof doc.group === 'string' ? doc.group.trim() : '';
            if (groupSlug) {
              const groupResult = await req.payload.find({
                collection: 'groups',
                where: { slug: { equals: groupSlug } },
                depth: 0,
                limit: 1,
                overrideAccess: true,
              });
              const found = groupResult.docs[0] as { image?: string | null; title?: string | null } | undefined;
              if (found) {
                group = { image: found.image ?? null, title: found.title ?? null };
              }
            }

            const { htmlBody, textBody } = buildPostNewsletterContent({
              ...(doc as Post),
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

            // Mark as sent via the local Payload API
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
            // Don't fail the save if newsletter send fails; log and continue
            console.error('[newsletter] Failed to send campaign:', err);
          }
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
