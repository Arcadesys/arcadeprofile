# ActiveCampaign blog notifications

When a Payload **post** first transitions to **published** and `newsletterSent` is false, the [`collections/Posts.ts`](../collections/Posts.ts) `afterChange` hook calls [`sendBlogPostNewsletter`](../lib/activecampaign.ts). That flow (all **API v3**):

1. Creates a **single-send campaign shell** (`POST /api/3/campaign` with `type: "single"`).
2. Loads the campaign, reads its **`message_id`**, and **updates that message** with HTML and text (`PUT /api/3/messages/{id}`).
3. **Schedules** the send to your newsletter list (`PUT /api/3/campaigns/{id}/edit` with `listIds` and `scheduledDate`).

**When the list send is scheduled in AC:** the app passes the post’s **`publishedDate`** (go-live time) as `scheduledDate` when the hook runs. If that time is already in the past, it **clamps to the current time** so AC still accepts the schedule. Times use the **Node process timezone**; align your server/AC account expectations in staging.

**Flipping scheduled drafts to live:** use [`app/(frontend)/api/posts/publish-scheduled/route.ts`](../app/(frontend)/api/posts/publish-scheduled/route.ts). Any trusted caller (external scheduler, `curl`, serverless cron elsewhere) can `GET` or `POST` that URL with `Authorization: Bearer <CRON_SECRET>`. (Vercel platform crons are not configured in this repo; you bring your own trigger.) The route’s `payload.update` sets `publishedDate` from `scheduledPublishDate` and moves `_status` to `published`, so the same `afterChange` hook runs and the AC send uses that go-live time.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AC_API_URL` | Yes* | Base URL only, no path (e.g. `https://youraccount.api-us1.com`). Use the host under **Settings → Developer → API**. |
| `AC_API_KEY` | Yes* | API token. Sent as `Api-Token` on every request. |
| `AC_NEWSLETTER_LIST_ID` | Yes* | Numeric **List** ID for blog subscribers. |
| `AC_NEWSLETTER_FROM_EMAIL` | Yes* | Verified From address in ActiveCampaign. |
| `AC_NEWSLETTER_FROM_NAME` | No | Defaults to `The Arcades`. |
| `AC_NEWSLETTER_REPLY_TO` | No | Defaults to the from email. |

\*Aliases accepted: `ACTIVECAMPAIGN_API_URL`, `ACTIVECAMPAIGN_API_KEY`, `ACTIVECAMPAIGN_LIST_ID`, `ACTIVECAMPAIGN_FROM_EMAIL`, `ACTIVECAMPAIGN_FROM_NAME`, `ACTIVECAMPAIGN_REPLY_TO`. If `AC_NEWSLETTER_FROM_EMAIL` is unset, **`POSTMARK_FROM_EMAIL`** is used when present (same verified address is common).

Copy [`.env.example`](../.env.example) to `.env.local` and set values locally; configure the same keys on Vercel (or your host) for production.

## Idempotency and failures

- After a **successful** send, the hook sets `newsletterSent` and `publish_status` to `sent`, so the same post does not send twice.
- If ActiveCampaign returns an error, the post still saves; check server logs for `[newsletter] Failed to send campaign`. Fix AC configuration or content, then you can clear `newsletterSent` in the admin (or republish workflow) if you need a manual retry.

## RSS (optional ActiveCampaign RSS-triggered campaign)

The site exposes [`/feed.xml`](../app/(frontend)/feed.xml/route.ts) with:

- Only **`_status: published`** posts ([`getPublishedPostsForRss`](../lib/blog.ts)).
- **`description`**: excerpt.
- **`content:encoded`**: full HTML from the same builder as the email body ([`buildPostNewsletterContent`](../lib/newsletter.ts)).
- **Permalink**, **pub date**, and **author** per item.

You can point an [RSS-triggered campaign](https://help.activecampaign.com/hc/en-us/articles/206641310) at `https://your-domain/feed.xml` instead of (or in addition to) the API hook. RSS polling is **not** instant; the hook is preferred for same-time delivery. If you use **both**, subscribers could receive duplicate mail unless lists differ.

## ActiveCampaign UI checklist (API path)

1. Verify **sender** / domain for `AC_NEWSLETTER_FROM_EMAIL`.
2. Create or choose a **List**; copy its ID into `AC_NEWSLETTER_LIST_ID`.
3. Generate an **API key** and note the **API URL** for `AC_API_URL` / `AC_API_KEY`.
4. Publish a test post to a staging list first; confirm one campaign and correct HTML in ActiveCampaign reporting.

## References

- [ActiveCampaign API overview](https://developers.activecampaign.com/reference/overview)
- [Create Campaign (v3)](https://developers.activecampaign.com/reference/create-campaign)
- [Update a message (v3)](https://developers.activecampaign.com/reference/update-a-message)
- [Edit campaign / schedule (v3)](https://developers.activecampaign.com/reference/edit-campaign)
