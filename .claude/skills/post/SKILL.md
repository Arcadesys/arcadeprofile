---
name: post
description: Draft a new Post via the Payload MCP `create_post` tool with auto-filled SEO/discoverability fields. Use when the user says "/post", "create a post", "draft a post", "post this", or hands over a finished piece they want saved as a Post. Always creates a draft; scheduling is an explicit handoff to schedule-essay or schedule-fiction.
---

# Post

Thin wrapper over the Payload MCP `create_post` tool. Always creates a `draft`. Scheduling is delegated.

## Required inputs

`title`, `excerpt`, `content` — same as the `create_post` schema. If any is missing, list what's missing and ask for it. Do **not** invent a title or excerpt; do not run the tool with placeholders.

## Always-filled SEO + social fields

These are **not optional**. Draft every one of them from the content before calling `create_post`. Show them as a YAML-ish block, take any edits the user wants, then include them all in the payload. Never skip a field or pass an empty string.

- `meta.title` — `<title>` override, ≤60 chars.
- `meta.description` — 150–160 chars, plain prose.
- `meta.keywords` — comma-separated, 4–8 keywords.
- `discoverability.social_hook` — Bluesky/Mastodon teaser, ≤280 chars, no hashtags unless the user asks.
- `discoverability.search_summary` — 2–3 sentences, front-load main claims.
- `discoverability.primaryCTA` — `{ label, href, description }`. Default to a "Subscribe" or "Read more from this series" CTA if the post doesn't suggest a more specific next step. If the post points at a project/book/page/external link, use that.

## Image (always ask)

After the user confirms the SEO block, **always ask**: "Do you have an image for this post?" Accept a file path, an attached image, or "no".

If the user provides an image:

1. Upload it to the site via MCP `upload_and_embed_image` (preferred — returns the embed placeholder and the media id) or `upload_image` (returns the media id only).
2. If MCP upload fails with `ENOENT` or a sandbox read error, fall back to `curl -F file=@<path> http://localhost:3000/api/media` (with the dev server running) — the MCP sandbox blocks local file reads in some environments.
3. Embed the image at the top of the post body using the `![media:<id>]()` placeholder on its own line, before the first paragraph. The `create_post` handler resolves it to a Lexical media node.
4. Set the same media id on the post's hero/featured image field if Posts has one (check `collections/Posts.ts` for the current field name); otherwise the embedded top-of-body image is sufficient.

If the user says no, proceed without an image — don't invent one or pick a stock image.

## Group validation

If the user supplies a `group` slug:

1. Call MCP `list_groups` once and confirm the slug exists.
2. If not found, list close matches and stop. Don't guess.
3. Note the group's `category` for the scheduling handoff (below).

If no group is supplied, that's fine — `create_post` accepts a group-less post.

## Creating the post

Call MCP `create_post` with:

- `title`, `excerpt`, `content` from the user.
- `publish_status: 'draft'` (always — never `'scheduled'`, `'published'`, or `'sent'` from this skill).
- `group` only if validated above.
- The reviewed `meta.*` and `discoverability.*` fields.
- Omit `slug` — let the handler auto-generate from title.
- Omit `scheduledPublishDate` and `publishedDate` — drafts don't need them.

After the call, print:

- The new post's `slug` and `id`.
- The admin URL: `/admin/collections/posts/<id>`.

## Optional handoff to scheduling

Then ask: **"Schedule this?"** If yes, route by the group's `category`:

- `fiction` → invoke `/schedule-fiction` (Mon/Wed/Fri).
- Anything else (`writing`, `tools`, `experiments`, `community`, `audio-video`) → invoke `/schedule-essay` (Tue/Thu).
- No group, or ambiguous → ask the user which lane before invoking.

The schedule skill will pick the slot and flip the post to `scheduled`. Don't do it inline here.

## Tools

- MCP `create_post` (write) — the main call.
- MCP `list_groups` (read) — group validation.
- MCP `upload_and_embed_image` / `upload_image` (write) — image upload. Fall back to `curl -F file=@<path> http://localhost:3000/api/media` if the MCP sandbox blocks the file read.
- Skill: `/schedule-essay`, `/schedule-fiction` — scheduling handoff.

## Don't

- Don't set `publish_status` to anything but `'draft'`. The schedule skills own the `scheduled` transition; the cron owns `published`.
- Don't skip the SEO + social block — `meta.*`, `discoverability.social_hook`, `discoverability.search_summary`, and `discoverability.primaryCTA` are always set.
- Don't skip the image prompt. Always ask, even if the user didn't mention one.
- Don't embed an image you didn't upload through `/api/media` or the MCP image tools — external URLs won't survive Lexical conversion cleanly.
- Don't invent or fuzzy-match a group slug. Validate via `list_groups`.
- Don't reimplement slug generation — the MCP handler does it.
- Don't set `suppressNewsletter` unless the user explicitly says "no newsletter".
