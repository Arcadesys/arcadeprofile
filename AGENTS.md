# AGENTS.md

## Project

Arcades Profile is a Next.js 16 / React 19 personal site deployed on Vercel.
Public essays, project manifests, portfolio reader bodies, and collection reader
bodies are repository-owned Markdown. Vercel Blob URLs provide media and
downloads. A standalone email service (`services/email`) owns subscriber
consent/preferences and adapts to Kit for newsletter broadcasts, with Postmark
kept for transactional mail; see the Email section below.

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

`/api/subscribe` and `npm run newsletter:post` both call `lib/email-service.ts`,
a thin client for the standalone service at `services/email` (own README and
`docs/email-service-migration.md`). That service owns subscriber consent and
suppression state locally, upserts/tags/broadcasts through Kit, and keeps
Postmark for transactional mail (test sends, future account email). It is not
yet hosted anywhere — see `docs/email-service-migration.md` for the remaining
cutover steps. Until `EMAIL_SERVICE_URL`/`EMAIL_SERVICE_SUBSCRIBE_KEY`/
`EMAIL_SERVICE_ADMIN_KEY` point at a real deployment, subscribe and send calls
fail closed (subscribe returns a 502; the send script throws).

`lib/activecampaign.ts` and `lib/postmark.ts` (the pre-migration vendor
libraries) have been removed as dead code; the site never called them once
the service boundary landed.

`npm run newsletter:post` flags:

- no flag: dry run
- `--preview-to <email>`: explicit test
- `--send`: verify the production URL, resolve All + Essays recipients, send
- `--resend --reason "<reason>"`: intentional repeat after a completed send

Receipts under `data/newsletter-sends` must remain non-PII. Service receipts
mean accepted, not delivered — read `docs/email-service-migration.md` before
trusting a send.

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
