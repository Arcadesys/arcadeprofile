# Blog: schedule -> published -> Postmark

This document describes how a post moves from a scheduled draft to a public article and how per-post email delivery works in this codebase.

## Key files

- [`collections/Posts.ts`](../collections/Posts.ts) - post workflow fields and `newsletterSend` state.
- [`app/(frontend)/api/posts/publish-scheduled/route.ts`](../app/(frontend)/api/posts/publish-scheduled/route.ts) - authorized HTTP job that flips due drafts to published.
- [`lib/publishScheduled.ts`](../lib/publishScheduled.ts) - publish loop, Postmark delivery trigger, and failed-send retry.
- [`lib/activecampaign.ts`](../lib/activecampaign.ts) - ActiveCampaign list ID, contact lookup, and subscribe/unsubscribe helpers.
- [`lib/post-newsletter-delivery.ts`](../lib/post-newsletter-delivery.ts) - resolves audiences, fetches recipients, renders content, and sends via Postmark.
- [`lib/postmark-events.ts`](../lib/postmark-events.ts) - records Postmark send/webhook events and refreshes post-level delivery counts.
- [`lib/newsletter.ts`](../lib/newsletter.ts) - HTML/text body for the email and RSS.

## Payload: what is "published"

Published vs draft is stored state in the database. Nothing inside Payload automatically fires at a calendar time. A write must promote the post, either from the admin or from the scheduled publish job.

## Scheduled publish flow

1. Editor sets `publish_status: scheduled` and `scheduledPublishDate`.
2. GitHub Actions or another trusted scheduler calls `/api/posts/publish-scheduled` with `Authorization: Bearer <CRON_SECRET>`.
3. The route publishes due posts and sets `publishedDate`.
4. For each successfully published post, the job sends the per-post newsletter unless `suppressNewsletter` is true or `newsletterSend.status` is already `sent`.
5. Successful Postmark acceptance creates `postmark-events` rows, updates `newsletterSend`, and moves `publish_status` to `sent`.
6. Failed or partially failed delivery leaves the post public as `published`, records `newsletterSend.status: failed`, and is retried by later scheduled publish runs. Retries skip recipients that already have a Postmark `submitted` event for that post.
7. Postmark webhooks at `/api/postmark/webhook` record delivery/bounce/open/click/complaint events and refresh the post-level counts in `newsletterSend`.

## Subscriber source

ActiveCampaign remains the source of truth for subscribers and audience preferences. The public subscribe endpoint still writes contact/list status to AC. Newsletter delivery reads active contacts from the configured AC lists and sends through Postmark.

See [ActiveCampaign + Postmark blog notifications](./activecampaign-blog-notifications.md) for env vars and API details.
