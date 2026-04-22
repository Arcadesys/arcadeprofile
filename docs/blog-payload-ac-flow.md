# Blog: schedule → published → ActiveCampaign

This document describes how a post moves from a scheduled draft to a public article and how the newsletter is scheduled in ActiveCampaign (AC) in this codebase.

## Key files

- [`collections/Posts.ts`](../collections/Posts.ts) — `afterChange` hook: first publish, newsletter, idempotency.
- [`app/(frontend)/api/posts/publish-scheduled/route.ts`](../app/(frontend)/api/posts/publish-scheduled/route.ts) — authorized HTTP job that flips due drafts to published.
- [`lib/activecampaign.ts`](../lib/activecampaign.ts) — AC API v3: campaign shell, message `PUT`, campaign `edit` with `scheduledDate`.
- [`lib/newsletter.ts`](../lib/newsletter.ts) — HTML/text body for the email and RSS.
- [`app/(frontend)/feed.xml/route.ts`](../app/(frontend)/feed.xml/route.ts) — RSS; unrelated to email send, but same “published = query at request time” idea.

## Payload: what is “published”

Published vs draft is **stored state** in the database (Payload **versions** with `_status`). Nothing inside Payload automatically fires at a calendar time. A **write** must set `_status` to `published` (admin save, or your publish job).

## End-to-end flows

### A) Publish on a schedule (time-based go-live)

1. Editor keeps the post in **`_status: draft`** in Payload, sets **`publish_status: scheduled`**, and sets **`scheduledPublishDate`** to the intended go-live time.
2. A **separate process** (not Vercel Crons in this repo; use an external scheduler, `curl` with a secret, or another host) calls **`GET` or `POST `/api/posts/publish-scheduled`** with **`Authorization: Bearer <CRON_SECRET>`** (see [`.env.example`](../.env.example)).
3. The route runs `payload.find` for drafts that are `publish_status: scheduled` with `scheduledPublishDate <= now` (and optional per-run cap). For each due post, it `payload.update`s to **`_status: published`**, **`publish_status: published`**, and sets **`publishedDate`** from the scheduled time (or “now” as fallback).
4. The **`afterChange` hook** runs on that update. It detects **first-time publish** (previous version was not `published`) and `newsletterSent` is false.

### B) Publish immediately in the admin

The author moves the post to **published** in the CMS. The same **`afterChange`** branch runs on that first transition.

### When the AC newsletter send runs (both A and B)

1. The hook calls **`buildPostNewsletterContent`** and **`sendBlogPostNewsletter`**.

2. **`sendBlogPostNewsletter`** (see [activecampaign blog doc](./activecampaign-blog-notifications.md)):

   - `POST /api/3/campaign` (single send),
   - `GET /api/3/campaigns/{id}` for `message_id`,
   - `PUT /api/3/messages/{id}` with the HTML/text,
   - `PUT /api/3/campaigns/{id}/edit` with `listIds` and **`scheduledDate`**.

3. **`scheduledDate` in AC** is driven by the post’s **`publishedDate`** (public go‑live) passed as **`scheduledSendAt`**. If that instant is **already in the past** when the hook runs, the code **clamps to the current time** so AC still accepts the schedule. Formatting uses the **server’s local timezone**; validate against your AC account in staging.

4. On **success**, the hook updates the post: **`newsletterSent: true`**, **`publish_status: sent`**. On **failure**, the post remains saved; errors are **logged** only.

## RSS (`/feed.xml`)

The feed is built **on request** (`force-dynamic`). It only includes posts the query treats as published; there is no separate background “feed sync” job. See the route file above.

## Long-term “Path A” and triggers

**Current design:** the **publish route** is a **generic HTTP** endpoint. You provide **any** secure caller to hit it on a cadence. This repository does not configure **Vercel’s** cron list in `vercel.json`; you can still use a **non-Vercel** scheduler, GitHub Actions, or manual calls.

**Alignment with email:** the **list send time in AC** is tied to **`publishedDate`** (go-live), not the moment the `afterChange` hook executes, except when a past go-live is clamped to “now” as above.

**Future options** (if you outgrow this): a dedicated `newsletterSendAt` field for “post at T1, email at T2,” or a different host for scheduled Payload updates only—treat that as a product follow-up, not a requirement of the current code path.

## ActiveCampaign “Agents” MCP in Cursor (optional)

Your local Cursor can define **`activecampaign-agents`** in `mcp.json` (HTTP endpoint on your `activehosted` host) for ad-hoc questions against AC’s agent/MCP layer. It is **not** required to run this app. Check **Cursor → Settings → MCP** to confirm the server shows as connected; if tools do not list, the endpoint may need auth headers or the server may be down—fix there before relying on it.

## References

- [ActiveCampaign blog notifications](./activecampaign-blog-notifications.md) — env vars, v3 API links, UI checklist.
- [ActiveCampaign: Edit campaign](https://developers.activecampaign.com/reference/edit-campaign) — `scheduledDate` in API v3.
