import type { CollectionConfig } from 'payload';

import type { Post } from '../payload-types';
import { buildPostNewsletterContent } from '../lib/newsletter';
import { discoverabilityFields, metaFields } from './fields/discoverability';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'publish_status',
      '_status',
      'scheduledPublishDate',
      'publishedDate',
      'newsletterSent',
    ],
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // Revalidate Next.js ISR cache
        import('next/cache')
          .then(({ revalidatePath }) => {
            try {
              const slug = doc.slug as string;
              const group = doc.group as string;
              revalidatePath(`/blog/${slug}`);
              revalidatePath('/blog');
              revalidatePath('/writing');
              revalidatePath('/feed.xml');
              if (group) {
                revalidatePath(`/writing/group/${group}`);
                revalidatePath(`/${group}`);
              }
            } catch {
              // revalidatePath may fail outside request context
            }
          })
          .catch(() => {});

        // Send newsletter when a post is first published and newsletterSent is false
        const wasPublished = previousDoc?._status !== 'published';
        const isNowPublished = doc._status === 'published';
        const notYetSent = !doc.newsletterSent;

        if (isNowPublished && wasPublished && notYetSent) {
          try {
            const { sendBlogPostNewsletter } = await import('../lib/activecampaign');
            const subject = (doc.newsletterHeading as string) || (doc.title as string);
            const { htmlBody, textBody } = buildPostNewsletterContent(doc as Post);

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
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.title) {
              return siblingData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            }
            return value;
          },
        ],
      },
    },
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
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
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
      type: 'date',
      admin: {
        position: 'sidebar',
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
      name: 'author',
      type: 'text',
      defaultValue: 'Austen Tucker',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
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
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
        { label: 'Sent', value: 'sent' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
        description: 'Workflow status for newsletter pipeline.',
      },
    },
    ...discoverabilityFields,
    ...metaFields,
  ],
};
