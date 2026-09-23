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

`/api/subscribe` submits each selected preference to its Kit double opt-in
form through the v4 API using server-only `KIT_API_KEY`. The site creates one
inactive subscriber and requests membership on each selected form; Kit sends
separate confirmation emails, one per selected preference. The signup API must
not apply audience tags. A daily authenticated cron reads every page of active
form members and then tags those confirmed subscribers for their audience.
Configure the four `KIT_FORM_*_ID`, four `KIT_TAG_*_ID`, and `CRON_SECRET`
values. Keep `KIT_RECONCILE_ENABLED` unset until per-form confirmation is
proven for already-active contacts; only the exact value `true` enables writes.
This free-plan reconciliation can take up to a day after confirmation.

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
