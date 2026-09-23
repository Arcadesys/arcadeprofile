# AGENTS.md

## Project

Arcades Profile is a Next.js 16 / React 19 personal site deployed on Vercel.
Public essays, project manifests, portfolio reader bodies, and collection reader
bodies are repository-owned Markdown. Vercel Blob URLs provide media and
downloads. Kit owns newsletter signup confirmation and broadcast delivery;
Postmark is used only for explicitly addressed previews.

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run newsletter:post -- --slug <slug>
npm run postmark:test
npm run upload:image -- <path> --alt "<text>"
npm run generate:portfolio
npm run generate:zoo
npm run generate:zoo-complete-edition
```

Use npm only. CI uses Node 20 and the built-in Node test runner through `tsx`.

## Content

- Public essays: `content/posts/<group>/<slug>.md`
- Group manifests: `content/posts/<group>/_group.json`
- Private drafts: `content/drafts`
- Portfolio and collection reader Markdown: `data/portfolio-content`

Frontmatter is strict and validated by `lib/markdown-posts.ts`.
`publishDate` is the only public visibility control. Future-dated files require
a later commit/deployment; there is no scheduler or preview-token backend.

The essay groups are defined in `lib/newsletter-post.ts`. Do not add chat
fiction to the essay/project index. Independent fiction stays in the portfolio,
collection, books, and toys surfaces.

## Cross-imprint canonical publishing policy

This policy is shared by `Arcadesys/work-thearcades-me` and
`Arcadesys/arcadeprofile`. Keep both root `AGENTS.md` files aligned when changing it.

**Always prefer `https://work.thearcades.me` as the canonical professional imprint
when the same or substantially duplicated piece exists on both sites, regardless
of which site published it first.** This applies to imports, syndication,
migrations, and republication.

- Compare the actual editions before classifying them as duplicates. A personal
  Bunch essay and a distinct technical Bunch case study may each be canonical to
  themselves. Shared subject matter alone is not duplication; fiction and other
  content unique to the creative site stay independently canonical there.
- Maintain an explicit per-piece mapping from the creative URL at
  `https://www.thearcades.me` to the exact work-edition URL. Verify that the work
  destination is live, public, and indexable before switching signals. If it is
  missing, draft, or unlisted, stage the migration and preserve the existing
  public edition until the destination is ready. Never guess a matching slug or
  point every page at the work homepage.
- The work edition must declare its own absolute URL as canonical. A retained
  creative-site duplicate must declare that exact work URL as its cross-domain
  canonical. Keep `og:url` and structured-data document identity, including
  `mainEntityOfPage`, consistent with the chosen canonical edition.
- Include the canonical work edition in the work sitemap and exclude the
  creative duplicate from the creative sitemap. Discovery links recommending
  the definitive edition should lead to the work URL; contextual links to
  genuinely distinct creative pieces should remain intact.
- Preserve original publication dates, source attribution, and provenance. A
  preferred canonical edition does not rewrite publication history.
- A canonical preference is not permission to delete, redirect, or retire the
  creative copy. Those actions require explicit authorization for the affected
  URLs. Existing release gates, including the resume cutover gate in
  `Arcadesys/arcadeprofile/docs/resume-domain-cutover.md`, remain in force.
- Preserve private, draft, unlisted, and intentionally `noindex` behavior. Do not
  expose protected pages through sitemaps, feeds, or discovery links as part of
  an SEO cleanup.
- When implementing canonical mappings or changing metadata, publishing, or
  import pipelines, add or update tests for work self-canonicals, creative
  cross-domain canonicals, sitemap exclusions, and distinct pieces retaining
  their own canonicals. Check emitted HTML metadata, not only source config.

## Email

`/api/subscribe` does an exact Kit status read, then stores the submitted email
as AES-GCM ciphertext plus selected preferences in a 24-hour Upstash challenge and sends one
explicitly addressed Postmark verification email. It performs no Kit writes.
The same email/audience bundle uses a keyed ten-minute Redis cooldown to avoid
repeat sends after ambiguous provider responses.
The verification URL carries its signed token in a fragment; the page clears
that fragment before rendering and only an explicit POST button can claim it.
After the click, active Kit subscribers get the requested form memberships and
tags. New or inactive subscribers get the requested double-opt-in form
memberships; email ciphertext is removed as soon as Kit returns a subscriber ID.
The Redis record then retains only Kit subscriber ID and selected
preferences for up to 30 days. Kit can send an additional confirmation before
delivery begins. A daily authenticated cron checks only these Redis-verified
records and tags only their stored audience choices after Kit reports `active`.
It never infers selections from raw form-member listings. Configure Kit form
and audience tag IDs, `KIT_TAG_ARCADEPROFILE_ID`, `KIT_API_KEY`, `CRON_SECRET`,
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` or Vercel-injected
`KV_REST_API_URL`/`KV_REST_API_TOKEN`, `SIGNUP_LINK_SECRET`, and
the Postmark transactional sender. The site must fail closed when those values
are missing. Kit Free can delay tags until the daily cron runs.

The approved Writing welcome is one-time per address, after explicit link claim
and Kit-active checks. With multiple choices, select one copy in this order:
All Writing, Fiction, Essays, Lab; keep all selected memberships and tags. Do
not welcome imported contacts or Kit DOI-pending subscribers. Welcome emails
carry an RFC 8058 one-click unsubscribe header and an accessible linked page.
The page GET is inert and its button explicitly submits; both update Kit state.
Exclude `/subscribe/verify` and `/subscribe/unsubscribe` from analytics so
their token fragments are never captured.

`npm run newsletter:post` flags:

- no flag: dry run
- `--preview-to <email>`: explicit test
- `--send`: verify the production URL, target All Writing OR Essays tags, and
  schedule the Kit broadcast
- `--resend --reason "<reason>"`: intentional repeat after a completed send

Receipts under `data/newsletter-sends` must remain non-PII. An ambiguous
pending Kit request must be reconciled in Kit before retrying. Kit excludes
unsubscribed contacts from broadcasts.

## Conventions

- Keep changes scoped and preserve unrelated worktree changes.
- Commit messages use a short imperative subject.
- TypeScript is strict; avoid `any`.
- New REST routes belong under `app/(frontend)/api`.
- Never commit `.env*` files or credentials.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
