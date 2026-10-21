# AGENTS.md

## Project

Arcades Profile is a Next.js 16 / React 19 personal site deployed on Vercel.
Public essays, project manifests, portfolio reader bodies, and collection reader
bodies are repository-owned Markdown. Vercel Blob URLs provide media and
downloads. Resend Contacts own subscriber status, and Resend Topics store
preferences and broadcasts. The shared mail transport sends first-party signup
verification, gated welcomes and explicit previews through Resend.

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run newsletter:post -- --slug <slug>
npm run upload:image -- <path> --alt "<text>" [--caption "<text>"] [--used-in <slug>]
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
- Media library: `content/media/library.json` (schema in `lib/media-library.ts`)

Images live in Vercel Blob; the media library is the committed catalog of them.
`npm run upload:image` uploads content-addressed bytes, records the entry, and
prints a figure line. Browse it locally at `/media` (404 in production). In post
Markdown, a standalone `![alt](url "caption")` line renders as a captioned figure.

Frontmatter is strict and validated by `lib/markdown-posts.ts`.
`publishDate` is the only public visibility control. Future-dated files require
a later commit/deployment; there is no scheduler or preview-token backend.

The essay groups are defined in `lib/newsletter-post.ts`. Do not add chat
fiction to the essay/project index. Independent fiction stays in the portfolio,
collection, books, and toys surfaces.

## Cross-imprint canonical publishing policy

This policy is shared by `Arcadesys/work-thearcades-me` and
`Arcadesys/arcadeprofile`. Keep both root `AGENTS.md` files aligned when changing it.

**`https://www.thearcades.me` always owns original provenance. When the same or
substantially duplicated piece exists on both sites, the thearcades.me original
is canonical and the work copy is marked "Originally published on" it.** This
applies to imports, syndication, migrations, and republication. Decision record:
`Arcadesys/arcadeprofile/docs/seo/canonical-policy.md` (map v2, 2026-10-03).

- Compare the actual editions before classifying them as duplicates. A personal
  Bunch essay and a distinct technical Bunch case study may each be canonical to
  themselves. Shared subject matter alone is not duplication; fiction and other
  content unique to the creative site stay independently canonical there.
- Maintain an explicit per-piece mapping from each work copy to the exact
  thearcades.me original URL (work `content/blog-sources.json` `url`). Verify the
  original is live, public, and indexable before pointing a copy at it. Never
  guess a matching slug or point every page at the creative homepage.
- The thearcades.me original declares its own absolute URL as canonical. A
  retained work copy declares that exact original URL as its cross-domain
  canonical. Keep `og:url` and structured-data document identity, including
  `mainEntityOfPage`, consistent with the original.
- Include the original in the creative sitemap and exclude the work copy from
  the work sitemap. Discovery links recommending the definitive edition lead to
  the original; contextual links to genuinely distinct pieces stay intact.
- Ship the creative self-canonical before the work cross-domain canonical, so
  the two editions never point at each other.
- Preserve original publication dates, source attribution, and provenance. A
  preferred canonical edition does not rewrite publication history.
- A canonical preference is not permission to delete, redirect, or retire the
  work copy. Those actions require explicit authorization for the affected
  URLs. Existing release gates, including the resume cutover gate in
  `Arcadesys/arcadeprofile/docs/resume-domain-cutover.md`, remain in force.
- Preserve private, draft, unlisted, and intentionally `noindex` behavior. Do not
  expose protected pages through sitemaps, feeds, or discovery links as part of
  an SEO cleanup.
- When implementing canonical mappings or changing metadata, publishing, or
  import pipelines, add or update tests for creative self-canonicals, work
  cross-domain canonicals, sitemap exclusions, and distinct pieces retaining
  their own canonicals. Check emitted HTML metadata, not only source config.

## Email

`/api/subscribe` performs a read-only Resend Contacts status check, then stores an AES-GCM encrypted email and selected topics in a 24-hour Upstash challenge and sends one first-party verification email. It makes no provider writes until the reader explicitly confirms by POST. Confirm creates or updates the Resend contact as subscribed and opts in only the selected Topics; topic changes are additive. Existing unsubscribed/suppressed contacts are never resubscribed. The keyed ten-minute Redis cooldown prevents repeat verification sends after ambiguous provider responses.

The signed verification token is carried in the URL fragment and cleared before rendering; only the explicit button POST can claim it. The Redis record keeps the Resend contact ID and selected preferences for up to 30 days, never plaintext email. There is no second confirmation email and no reconciliation cron. Configure `RESEND_API_KEY` (domain-restricted Sending access for `mail.thearcades.me`) and `RESEND_CONTACTS_API_KEY` (Full access: Contacts, Topics, Suppressions, and Broadcasts), `RESEND_TOPIC_*_ID`, `RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID`, mail sender values, `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or Vercel KV equivalents, `SIGNUP_LINK_SECRET`, and `CRON_SECRET`. Signup must fail closed if required configuration is missing.

The approved welcome series enrolls only after first-party confirmation and a subscribed Resend contact. Its queue stores a Resend contact ID, not a plaintext email; each send re-reads contact state and stops when unsubscribed. Keep `WELCOME_SERIES_ENABLED` default off and preserve the legacy `WRITING_WELCOME_ENABLED` gate. Both welcome paths retain once-only dedupe. Unsubscribe is global for the Resend contact, preserving the prior site's one-click and fallback semantics. GET stays inert; the explicit page button and RFC 8058 POST update Resend state. Exclude `/subscribe/verify` and `/subscribe/unsubscribe` from analytics.

`npm run newsletter:post` defaults to a dry run. `--send` verifies the production essay URL, creates a Resend Broadcast draft targeting the broad “All Subscribed Contacts” segment and passes the Essays topic scope, then explicitly schedules it. `--resend --reason "<reason>"` is required for intentional repeats after completed sends. Receipts remain non-PII; reconcile an ambiguous pending request in Resend before retrying.

Migration scripts are owner-run only from the main checkout. They read `.env.kit.local` for the final read-only export/suppression sync and `.env.resend.local` for full-access import. Never commit either file or the private snapshot. Follow `docs/kit-removal-runbook.md`; this PR must not merge before import counts are verified.

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
