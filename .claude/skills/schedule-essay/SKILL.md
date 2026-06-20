---
name: schedule-essay
description: Queue an essay onto the next available Tue/Thu publish slot. Use when the user says "schedule this essay", "queue this post for the essay stream", or hands over a non-fiction draft (on-writing, white-cane-chronicles, arcade-blog, etc.).
---

# Schedule essay

Essays publish **Tuesday and Thursday**. One scheduled essay per slot.

## Splitting rules

Essays are usually one post each — do not split unless the user asks. If the draft is clearly multi-part (numbered sections, explicit "Part 1 / Part 2" headers), confirm with the user before queuing each part to its own Tue/Thu slot in order.

## Queuing

For each essay:

1. Confirm the target group. Essay groups are anything with `category` ∈ {`writing`, `tools`, `experiments`, `community`, `audio-video`} — i.e. not `fiction`. Ask if ambiguous.
2. Create a `posts` record:
   - `title`, `excerpt`, `content` — straight from the draft. Convert markdown to Lexical via `/api/markdown-to-lexical` if needed.
   - `group` — essay group slug.
   - `order` — next integer after the current max `order` in that group.
   - `publish_status` — `'scheduled'`.
   - `scheduledPublishDate` — next available **Tue/Thu at 14:00 UTC** with no essay queued. Essays share the T/Th lane across groups; check all essay groups, not just the target one. The GitHub Actions scheduled-publish job runs every 15 minutes and will publish due posts.
   - `publishedDate` — same calendar date.
3. Print `<date> <slug>` per created post.

## Tools

Use the Payload MCP server (`mcp/payload-mcp.ts`) for `create_post`, `update_post`, `list_posts`, and `get_post`. Fall back to `/api/posts`.

## Don't

- Don't queue an essay onto a Mon/Wed/Fri slot — those belong to fiction.
- Don't publish directly; let the scheduled-publish job promote `scheduled` → `published`, send per-post newsletters through Postmark, and then move successfully delivered posts to `sent`.
- Don't set `newsletterSend` manually. The scheduled-publish job owns pending/skipped/failed/sent state and Postmark audit records.
- Don't create ActiveCampaign campaigns for per-post newsletters. ActiveCampaign owns contacts, list membership, and audience state; Postmark sends the mail.
