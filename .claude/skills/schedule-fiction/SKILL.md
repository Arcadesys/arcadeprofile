---
name: schedule-fiction
description: Chunk a fiction draft into scene-sized posts and queue them onto the next available Mon/Wed/Fri publish slots. Use when the user says "schedule this fiction", "queue these chapters", or hands over a long-form story file/markdown with `---` scene breaks.
---

# Schedule fiction

Fiction posts publish **Monday, Wednesday, and Friday**. Each post is one full scene.

## Splitting rules

The draft uses `---` as a scene break, but `---` is only a *candidate* split. Apply judgment:

- **Split at `---` only when the scene has landed.** A scene has landed when one of these is true:
  - A POV shift, time jump, or location change happens after the break.
  - The tension introduced earlier in the section has resolved (or pivoted into a new conflict that belongs to the next scene).
  - The last paragraph functions as a button — a beat the reader can sit with.
- **Do not split mid-tension.** If the section ending in `---` leaves a sword raised, a question dangling that the next scene immediately answers, or a thought mid-pivot, merge it with the next section. The published unit is the *scene*, not the editor's separator.
- **Length is a tiebreaker, not a target.** A 500-word scene and a 4,000-word scene are both fine. Do not pad or trim to hit a wordcount.
- If you merge or split against the `---`s as written, surface that decision to the user before queuing — one line per affected break (`kept break 3 (POV shift)`, `merged breaks 5–6 (cliffhanger continues)`).

## Queuing

For each scene-post:

1. Determine the target group from context (the user will name it, or infer from the source file's directory in `content/blog/`). Confirm with the user if ambiguous.
2. Set fields on a new `posts` record:
   - `title` — from the scene's working title or first line; ask if unsure.
   - `content` — the scene's prose, converted to Lexical via `POST /api/markdown-to-lexical` if the source is markdown.
   - `excerpt` — 1–2 sentence pull, no spoilers past the scene's opening.
   - `group` — the fiction group slug.
   - `order` — next integer after the current max `order` in that group.
   - `publish_status` — `'scheduled'`.
   - `scheduledPublishDate` — next available **Mon/Wed/Fri at 08:00 UTC** that doesn't already have a fiction post queued. (08:00 UTC sits an hour before the 09:00 UTC cron, so the post drops that morning.)
   - `publishedDate` — same calendar date as `scheduledPublishDate`.
3. Skip any date already occupied by a queued or published post in any fiction group — fiction shares the M/W/F lane across groups.
4. After creating each post, print `<date> <slug>` so the user can scan the lineup.

## Tools

Prefer the Payload MCP server (`mcp/payload-mcp.ts`) over raw HTTP — it has `posts.create` / `posts.find` and handles auth from `PAYLOAD_API_KEY`. Fall back to the REST API at `/api/posts` if MCP is unavailable.

## Don't

- Don't publish directly. Always go through `publish_status: 'scheduled'` so the daily cron handles the flip and the newsletter/social fan-out fires correctly.
- Don't set `newsletterSent`. The afterChange hook owns that.
- Don't backdate `scheduledPublishDate`; the cron treats anything in the past as immediately due.
