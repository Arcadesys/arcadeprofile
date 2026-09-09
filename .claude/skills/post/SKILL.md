---
name: post
description: Draft a new post as a Markdown file under content/posts/<group>/, with auto-filled SEO fields. Use when the user says "/post", "create a post", "draft a post", "post this", or hands over a finished piece they want saved as a post.
---

# Post

Writes a new post as a Markdown file at `content/posts/<group>/<slug>.md`. There is no CMS and no API — the repository is the content store, so this skill creates a file and stops. Publishing is a commit and a deploy.

## Required inputs

`title`, `excerpt`, `content`, and `group`. If any is missing, list what's missing and ask for it. Do **not** invent a title or excerpt; do not write the file with placeholders.

`group` is required by the schema — unlike the old CMS, there is no group-less post.

## Group validation

1. List `content/posts/*/` and confirm the group directory exists and contains a `_group.json`.
2. If not found, list close matches and stop. Don't guess, and don't create a new group directory as a side effect — a new group is its own decision, and needs a hand-written `_group.json`.

## Frontmatter

`lib/markdown-posts.ts` validates frontmatter with a **strict** Zod schema: any key not listed below is a hard error that fails the build, not a warning. The fields are:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique across every post in `content/posts`. Quoted string of an integer. Take the current max and add one. |
| `title` | yes | Non-empty. |
| `slug` | yes | Lowercase kebab-case. Must match the filename. |
| `group` | yes | Lowercase kebab-case. Must match the parent directory name. |
| `publishDate` | yes | RFC 3339 with an offset, e.g. `'2026-09-09T12:00:00.000Z'`. |
| `updatedDate` | no | Same format. |
| `order` | no | Non-negative integer. |
| `excerpt` | no | Set it anyway — it's the card and feed summary. |
| `tags` | no | Array of non-empty strings. |
| `hero` | no | `{ src, alt }`, both required when present. `src` is a Vercel Blob URL. |
| `seo` | no | `{ title?, description? }` only. |
| `pdf` | no | `{ overrideUrl? }`. |

Get the next `id` with:

```bash
grep -h "^id:" content/posts/*/*.md | tr -d "id: '" | sort -n | tail -1
```

## SEO block

Draft `seo.title` and `seo.description` from the content before writing the file. Show them back, take any edits, then include them.

- `seo.title` — `<title>` override, ≤60 chars.
- `seo.description` — 150–160 chars, plain prose.

There is nowhere to put keywords, a social hook, a search summary, or a CTA. The old CMS had `meta.*` and `discoverability.*` fields; the strict schema rejects them. Don't add them back as frontmatter — if the user wants a social teaser, hand it to them as text to post, not as a field.

## Image (always ask)

After the user confirms the SEO block, **always ask**: "Do you have an image for this post?" Accept a file path, an attached image, or "no".

If the user provides one, hand off to `/upload-image` to get a blob URL, then:

- Set `hero: { src: <blob url>, alt: <alt text> }` in the frontmatter, and/or
- Embed it in the body as ordinary Markdown: `![alt text](<blob url>)`.

`lib/markdown-render.ts` renders `![alt](url)` to an `<img>` for any `http(s)`, root-relative, or `mailto:` URL. **Alt text is effectively mandatory** — the renderer's pattern requires a non-empty alt, and `![](url)` falls through and renders as literal text.

If the user says no, proceed without an image — don't invent one or pick a stock image.

## Writing the file

Write to `content/posts/<group>/<slug>.md` with the frontmatter block followed by the body Markdown. Then:

1. Run `npm test` — the loader tests parse every post, so a schema violation fails here.
2. Print the file path and the `publishDate`.

## Visibility

`publishDate` is the **only** visibility control. `selectPublicMarkdownPosts()` hides posts whose `publishDate` is in the future, evaluated at request time against the deployed build.

There is no scheduler and no cron. A future-dated post does not appear on its own — it needs a commit and a deployment at or after that date. Say this out loud when you set a future date, so the user isn't waiting on a job that doesn't exist.

## Newsletter

Sending is a separate, manual step and is **not** part of this skill:

```bash
npm run newsletter:post -- --slug <slug>
```

Dry run by default; `--preview-to <email>` for a test; `--send` to send for real. Only the six groups in `ESSAY_GROUPS` (`lib/newsletter-post.ts`) are eligible. Don't run it from here — mention it and let the user decide.

## Don't

- Don't add frontmatter keys outside the table above. The schema is strict and will fail the build.
- Don't reuse an `id`. Duplicates throw at load time with both file paths named.
- Don't let `slug` or `group` disagree with the filename and directory — both are checked.
- Don't skip the SEO block or the image prompt.
- Don't invent or fuzzy-match a group slug, and don't create a group directory implicitly.
- Don't commit, push, or deploy unless the user asks.
