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
      async ({ doc, req }) => {
        // Send newsletter while the post is in a public state and newsletterSent
        // is still false. The newsletterSent flag — flipped only when every
        // audience succeeds — is the idempotency gate, so a partial failure on
        // first publish can be retried by re-saving the post. Public states
        // are 'published' and 'sent'.
        const isNowPublished =
          doc.publish_status === 'published' || doc.publish_status === 'sent';
        const notYetSent = !doc.newsletterSent;

        if (isNowPublished && notYetSent) {
          try {
            const { resolveGroupHeroForPost } = await import('../lib/post-newsletter');
            const { sendPostNewsletterFanOut } = await import('../lib/post-newsletter-fanout');
            const subject = (doc.newsletterHeading as string) || (doc.title as string);

            // afterChange's `doc` reflects the depth used by the triggering
            // operation, which is often 0 — that leaves `meta.image` as a bare
            // id and the renderer would skip the post hero, silently falling
            // back to the group image. Refetch with depth: 1 so the Media
            // upload is populated with `url`/`alt`.
            const populated = (await req.payload.findByID({
              collection: 'posts',
              id: doc.id as number,
              depth: 1,
              overrideAccess: true,
            })) as Post;

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
            // Don't fail the save if newsletter send fails; log and continue
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
      },
      async ({ doc, previousDoc, req }) => {
        // Fan out to social platforms (Bluesky, Facebook, Instagram, LinkedIn)
        // on the same transition that fires the newsletter: first time the
        // post enters a public state. Idempotency lives in lib/social — it
        // checks for existing social-posts rows per (slug, platform).
        const wasPublic =
          previousDoc?.publish_status === 'published' ||
          previousDoc?.publish_status === 'sent';
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';

        if (isNowPublic && !wasPublic) {
          try {
            const { autoPostToSocial } = await import('../lib/social');
            // Refetch with depth: 1 so meta.image is populated for Instagram.
            const populated = (await req.payload.findByID({
              collection: 'posts',
              id: doc.id as number,
              depth: 1,
              overrideAccess: true,
            })) as Post;
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
