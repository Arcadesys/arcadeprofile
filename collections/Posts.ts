import type { CollectionConfig } from 'payload';

import type { Post } from '../payload-types';
import { buildPostNewsletterContent } from '../lib/newsletter';
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
      'suppressNewsletter',
    ]),
  },
  hooks: {
    beforeChange: [promoteScheduledDraftHook],
    afterChange: [
      revalidatePostPaths,
      async ({ doc, req }) => {
        // On publish, fan out to per-post newsletter subscribers. Idempotency
        // lives in `newsletterSends` — a per-audience record of every
        // successful send. The fanout skips audiences already in that array,
        // so partial-failure retries and re-saves never produce duplicate AC
        // campaigns. `publish_status === 'sent'` is the rollup state, flipped
        // only when every targeted audience has a record. Social posting is
        // handled externally (Later via MCP).
        //
        // `suppressNewsletter` is an independent intent flag — when set, the
        // fan-out is skipped entirely (archival reposts, manual override).
        // Unlike the old `newsletterSent` boolean, it can't drift away from
        // delivery state because it doesn't pretend to be derived.
        const isNowPublic =
          doc.publish_status === 'published' || doc.publish_status === 'sent';

        const needsNewsletter =
          isNowPublic && !doc.suppressNewsletter && doc.publish_status !== 'sent';

        if (!needsNewsletter) return;

        const payload = req.payload;
        const postId = doc.id as number;
        const postSlug = doc.slug as string;
        const postTitle = doc.title as string;
        const postGroup = typeof doc.group === 'string' ? doc.group : '';
        const subject = (doc.newsletterHeading as string) || postTitle;
        let scheduledSendAt: Date | undefined;
        const publishedRaw = doc.publishedDate;
        if (typeof publishedRaw === 'string' && publishedRaw) {
          const t = new Date(publishedRaw);
          if (!Number.isNaN(t.getTime())) {
            scheduledSendAt = t;
          }
        }

        const runFanOut = async () => {
          let populated: Post;
          try {
            populated = (await payload.findByID({
              collection: 'posts',
              id: postId,
              depth: 1,
              overrideAccess: true,
            })) as Post;
          } catch (err) {
            console.error(
              '[publish-hooks] Failed to load populated post; skipping newsletter fan-out:',
              err instanceof Error ? err.message : err,
            );
            return;
          }

          try {
            const { resolveGroupHeroForPost } = await import('../lib/post-newsletter');
            const { sendPostNewsletterFanOut, resolveAudiences } = await import(
              '../lib/post-newsletter-fanout'
            );

            const group = await resolveGroupHeroForPost(payload, populated);

            // Fiction-vs-essay routing comes from the Group's `category` field
            // (set on the Groups collection). Posts without a group, or whose
            // group isn't categorized as fiction, fall under Essays.
            let groupCategory: string | null = null;
            if (postGroup) {
              const groupLookup = await payload.find({
                collection: 'groups',
                where: { slug: { equals: postGroup } },
                limit: 1,
                overrideAccess: true,
              });
              groupCategory = (groupLookup.docs[0]?.category as string | undefined) ?? null;
            }

            const { htmlBody, textBody } = buildPostNewsletterContent({
              ...populated,
              group,
            });

            type SendRecord = {
              audience: 'all' | 'fiction' | 'essays';
              sentAt?: string | null;
              messageId?: string | null;
              campaignId?: string | null;
              id?: string | null;
            };
            const existingSends: SendRecord[] = Array.isArray(populated.newsletterSends)
              ? (populated.newsletterSends as SendRecord[])
              : [];
            const alreadySent = existingSends
              .map((r) => r.audience)
              .filter((a): a is 'all' | 'fiction' | 'essays' =>
                a === 'all' || a === 'fiction' || a === 'essays',
              );

            const targetAudiences = resolveAudiences(groupCategory);

            const fanOut = await sendPostNewsletterFanOut({
              subject,
              htmlBody,
              textBody,
              slug: postSlug,
              scheduledSendAt,
              groupCategory,
              alreadySent,
            });

            for (const { audience, error } of fanOut.failures) {
              const detail = (error as { details?: unknown })?.details;
              const status = (error as { causeStatus?: number })?.causeStatus;
              console.error(
                `[newsletter] Failed to send ${audience} campaign:`,
                error instanceof Error ? error.message : error,
                ...(status !== undefined ? [`(HTTP ${status})`] : []),
                ...(detail ? [`| AC detail: ${detail}`] : []),
              );
            }

            // Batch all successful audiences into one update BEFORE flipping
            // the rollup flag. Re-read the doc once so a concurrent save's
            // newsletterSends entries aren't clobbered.
            if (fanOut.results.length > 0) {
              const fresh = (await payload.findByID({
                collection: 'posts',
                id: postId,
                depth: 0,
                overrideAccess: true,
              })) as Post;
              const freshSends: SendRecord[] = Array.isArray(fresh.newsletterSends)
                ? (fresh.newsletterSends as SendRecord[])
                : [];
              const now = new Date().toISOString();
              const newSends: SendRecord[] = fanOut.results
                .filter((r) => !freshSends.some((s) => s.audience === r.audience))
                .map((r) => ({
                  audience: r.audience,
                  sentAt: now,
                  messageId: r.messageId,
                  campaignId: r.campaignId,
                }));
              if (newSends.length > 0) {
                await payload.update({
                  collection: 'posts',
                  id: postId,
                  data: {
                    newsletterSends: [...freshSends, ...newSends],
                  },
                });
              }
            }

            // Flip publish_status='sent' only when every targeted audience
            // has a record (pre-existing + just-sent). publish_status is now
            // the single source of truth for "all delivered" — no separate
            // boolean to drift out of sync.
            const sentAudiences = new Set<string>([
              ...alreadySent,
              ...fanOut.results.map((r) => r.audience),
            ]);
            const allCovered = targetAudiences.every((a) => sentAudiences.has(a));
            if (allCovered && doc.publish_status !== 'sent') {
              await payload.update({
                collection: 'posts',
                id: postId,
                data: {
                  publish_status: 'sent',
                },
              });
            }

            console.log(
              `[newsletter] ActiveCampaign fan-out for "${postTitle}"`,
              JSON.stringify({
                postId,
                slug: postSlug,
                groupCategory,
                results: fanOut.results,
                skipped: fanOut.skipped,
                failures: fanOut.failures.map((f) => f.audience),
              }),
            );
          } catch (err) {
            const detail = (err as { details?: unknown })?.details;
            const status = (err as { causeStatus?: number })?.causeStatus;
            console.error(
              '[newsletter] Failed to send campaign:',
              err instanceof Error ? err.message : err,
              ...(status !== undefined ? [`(HTTP ${status})`] : []),
              ...(detail ? [`| AC detail: ${detail}`] : []),
            );
          }
        };

        // Detach from the admin save: AC's createMessage + createCampaign
        // round-trip per audience can take tens of seconds and previously
        // wedged the save modal. `next/server.after` runs the fan-out after
        // the response is sent but within the function's lifetime on Vercel;
        // outside a Next request context (seed scripts, tests) we
        // fire-and-forget instead. `publish_status !== 'sent'` is the retry
        // gate — partial-failure runs leave it as 'published' so a re-save
        // retries only the missing audiences.
        const fireAndForget = () => {
          void runFanOut().catch((err) => {
            console.error('[newsletter] background fan-out crashed:', err);
          });
        };
        try {
          const nextServer = await import('next/server');
          if (typeof nextServer.after === 'function') {
            nextServer.after(runFanOut);
          } else {
            fireAndForget();
          }
        } catch {
          fireAndForget();
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
      name: 'shareUrl',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/views/admin/PostShareLinkField#default',
        },
      },
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
          'When true, the fan-out hook skips sending entirely. Use for archival reposts or to override a stuck post. "All delivered" state lives in Workflow Status (sent) and the newsletterSends array — this flag is intent only.',
      },
    },
    {
      name: 'newsletterSends',
      type: 'array',
      admin: {
        position: 'sidebar',
        description:
          'Per-audience send log. The fanout hook skips any audience already in this list, so retries after a partial failure never produce duplicate AC campaigns.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'audience',
          type: 'select',
          required: true,
          options: [
            { label: 'All', value: 'all' },
            { label: 'Fiction', value: 'fiction' },
            { label: 'Essays', value: 'essays' },
          ],
        },
        { name: 'sentAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'messageId', type: 'text' },
        { name: 'campaignId', type: 'text' },
      ],
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
