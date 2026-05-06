---
name: scheduling-queue
description: Show the next 4 weeks of the publishing calendar with which slots are filled and which are open. Use when the user asks "what's queued?", "show the schedule", "are there any gaps?", or "when's the next open fiction slot?".
---

# Scheduling queue

Render the upcoming publishing calendar so the user can see the pipeline at a glance.

## Lanes

- **Fiction** — Mon / Wed / Fri. Posts in any group with `category: 'fiction'`.
- **Essays** — Tue / Thu. Posts in any group with `category` ∈ {`writing`, `tools`, `experiments`, `community`, `audio-video`}.
- Saturday/Sunday are dark.

## What to fetch

Query Payload for posts with `publish_status` ∈ {`'scheduled'`, `'published'`, `'sent'`} and `scheduledPublishDate` within the next 28 days, depth 1 (so `group` resolves to its category).

Use the Payload MCP `posts.find` tool when available; otherwise hit `/api/posts` with the cron bearer token.

## Output

A markdown table, one row per upcoming weekday in the lane:

```
| Date       | Day | Lane    | Status     | Title / slug                  |
| ---------- | --- | ------- | ---------- | ----------------------------- |
| 2026-05-08 | Fri | fiction | scheduled  | The Singularity Log #14       |
| 2026-05-12 | Tue | essays  | — open —   |                               |
```

After the table, print a one-line summary: `fiction: N/M slots filled · essays: N/M slots filled · next gap: <date> (<lane>)`.

If a slot has more than one queued post, flag it as `⚠ collision` so the user can resolve the order.

## Don't

- Don't mutate anything — this skill is read-only.
- Don't include drafts (`publish_status: 'draft'`); the cron ignores them, so they aren't really in the queue.
