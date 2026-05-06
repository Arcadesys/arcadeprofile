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
        // On publish, fan out to (1) the newsletter and (2) social platforms.
        // Public states are 'published' and 'sent'. The newsletterSent flag is
        // the retry gate for the newsletter — kept false until every audience
        // succeeds, so re-saving a published post retries any failed audiences.
        // Social fan-out is first-transition-only (idempotency lives in
        // social-posts rows). Both branches share a single populated doc fetch
        // so meta.image is populated for the newsletter renderer and Instagram.
        // Per-branch try/catch so a newsletter failure doesn't block social.
        const wasPublic =
          previousDoc?.publish_status === 'published' ||
          previousDoc?.publish_status === 'sent';
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';

        const needsNewsletter = isNowPublic && !doc.newsletterSent;
        const needsSocial = isNowPublic && !wasPublic;

        if (!needsNewsletter && !needsSocial) return;

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

        if (needsNewsletter) {
          try {
            const { resolveGroupHeroForPost } = await import('../lib/post-newsletter');
            const { sendPostNewsletterFanOut } = await import('../lib/post-newsletter-fanout');
            const subject = (doc.newsletterHeading as string) || (doc.title as string);

            const group = await resolveGroupHeroForPost(req.payload, populated);

            // Fiction-vs-essay routing comes from the Group's `category` field
            // (set on the Groups collection). Posts without a group, or whose
            // group isn't categorized as fiction, fall under Essays.
            let groupCategory: string | null = null;
            if (typeof doc.group === 'string' && doc.group) {
              const groupLookup = await req.payload.find({
                collection: 'groups',
                where: { slug: { equals: doc.group } },
                limit: 1,
                overrideAccess: true,
              });
              groupCategory = (groupLookup.docs[0]?.category as string | undefined) ?? null;
            }

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

            const fanOut = await sendPostNewsletterFanOut({
              subject,
              htmlBody,
              textBody,
              slug: doc.slug as string,
              scheduledSendAt,
              groupCategory,
            });

            for (const { audience, error } of fanOut.failures) {
              const detail = (error as any)?.details;
              const status = (error as any)?.causeStatus;
              console.error(
                `[newsletter] Failed to send ${audience} campaign:`,
                error instanceof Error ? error.message : error,
                ...(status !== undefined ? [`(HTTP ${status})`] : []),
                ...(detail ? [`| AC detail: ${detail}`] : []),
              );
            }

            // Only flip newsletterSent if every targeted audience succeeded —
            // otherwise we'd silently skip the missing list on a retry.
            if (fanOut.allSucceeded) {
              await req.payload.update({
                collection: 'posts',
                id: doc.id as number,
                data: {
                  newsletterSent: true,
                  publish_status: 'sent',
                },
              });
            }

            console.log(
              `[newsletter] ActiveCampaign fan-out for post "${doc.title}"`,
              JSON.stringify({
                postId: doc.id,
                slug: doc.slug,
                groupCategory,
                results: fanOut.results,
                failures: fanOut.failures.map((f) => f.audience),
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

        if (needsSocial) {
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
