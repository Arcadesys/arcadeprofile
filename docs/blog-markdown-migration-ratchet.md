# Blog Markdown Migration Ratchet

## Current best

Plain Markdown files will become the canonical blog source. Payload remains
unchanged while this foundation is built and verified.

Each post will live at `content/posts/<group>/<slug>.md` and use this strict
frontmatter contract:

```yaml
---
id: cold-boot
title: "Cold Boot"
slug: cold-boot
group: open-port
publishDate: "2026-08-20T09:00:00-05:00"
order: 1
updatedDate: "2026-08-20T09:00:00-05:00"
excerpt: "A short reader-facing description."
tags: [serial-fiction, open-port]
hero:
  src: /images/cold-boot.webp
  alt: "A meaningful text alternative for the hero image."
seo:
  title: "Cold Boot | The Arcades"
  description: "A concise search and social description."
---
```

Required: `id`, `title`, `slug`, `group`, and `publishDate`.

Optional: `order`, `updatedDate`, `excerpt`, `tags`, `hero`, and `seo`.

The parser rejects unknown fields. In particular, there is no `status`,
`draft`, preview-token, reaction, or newsletter-delivery field.

## Visibility contract

`publishDate` is the only visibility control:

```text
publishDate <= current time  public
publishDate > current time   hidden
```

Future posts must return 404 from public article routes and remain absent from
RSS, sitemap, navigation, and related-post results. Branch/PR deployments are
the editorial preview surface; secret preview links are retired.

## Retired features

- Reader reactions are retired. Existing counts may be retained only in a
  migration record, not presented or migrated into a new runtime store.
- Secret preview links are retired.
- Checked-in RSS files are not part of the design. The eventual `/feed.xml`
  route must be generated from the same validated post index as public pages.

## Ratchet log

| Iteration | Verdict | Current best |
| --- | --- | --- |
| Foundation | Strict loader, deterministic ordering, injected-time public selector, and isolated fixtures added. | Keep: it introduces no public route or Payload behavior change. |
| Export slice | Added a read-only, paginated Payload inventory CLI and a tested converter/parity reporter. It defaults to dry-run, writes only to an explicit caller-selected staging directory, and never promotes into `content/posts`. | Keep: public routes, RSS, sitemap, newsletter delivery, and Payload remain unchanged. A live read-only inventory/export still needs safe credentials and user direction. |
| Runtime slice | Added strict group manifests, a fail-closed `BLOG_SOURCE` switch, Markdown-backed blog/project adapters, a safe semantic renderer, and Markdown projections for article routes, legacy redirects, homepage/latest/projects, sitemap, and RSS. Payload remains the default. | In verification: requires all automated checks plus fixture route/feed parity before it can become the new current best. |
| Authenticated export | Read all four workflow states through the hosted read-only MCP channel. The verified inventory contained 81 records: 80 public/scheduled posts exported, one draft inventoried, and zero blocked. | Keep: 32 public essays and 48 fiction posts pass the same strict loader; the draft remains non-public. |
| Promotion | Promoted the 80 validated files and nine group manifests into `content/posts`, with the safe source-hash receipt at `data/payload-markdown-parity.json`. | In verification: Payload remains the active source until route/feed parity is exercised against the promoted corpus. |
| Draft preservation | Preserved the newer Payload copy of `the-fox-and-the-eval` under `content/drafts`, with strict draft-only frontmatter and a verified body hash. Exporter staging writes drafts under ignored `.drafts/`; the public loader never reads either location. | Keep: all 32 essay routes and legacy redirects passed in Markdown mode; the draft returned 404 and was absent from RSS and sitemap. Payload remains the active source. |
| Then | Enable Markdown in a separately reversible change after route/feed parity passes. | Pending. |

## Export contract

`npm run export:payload-posts -- --base-url https://example.test` inventories
Payload posts and groups without writing. `--write --staging-dir /absolute/path`
is required before files and `parity-report.json` are created. The exporter never
accepts a canonical `content/posts` target, never stores raw source documents,
and never logs a token. The report contains only source hashes and safe
identity/metadata needed to assess parity.

When a direct Payload credential is unavailable, the same exporter can use the
hosted read-only MCP channel:

```bash
ARCADEPROFILE_MCP_TOKEN=... npm run export:payload-posts -- \
  --mcp-url https://www.thearcades.me/api/mcp
```

MCP mode explicitly inventories `draft`, `scheduled`, `published`, and `sent`
posts, then retrieves each full document. Drafts are serialized under the
ignored `.drafts/` staging subtree for promotion into `content/drafts`; their
strict frontmatter has `status: draft`, no `publishDate`, and no preview secret.
The public Markdown runtime never reads that tree.

Published and sent posts may export when their groups, RFC 3339 dates, semantic
Lexical nodes, and media alt text pass validation. Drafts use the same semantic
conversion and media gates, but remain excluded from public export accounting.
Scheduled posts require a future `scheduledPublishDate`, which becomes their
Markdown `publishDate`; otherwise they are blocked. The separate Payload display
date is not a scheduling timestamp. Unsupported nodes, duplicate IDs/slugs,
unresolved groups, invalid dates, and legacy media URLs fail closed and appear in
the report instead of becoming Markdown.

## Rescue source receipt

- Verified source: `origin/main` at `bd4b318ada185eb5b785414480ec77a0829c0333`.
  The untouched root checkout HEAD was `69d4cad8938bb97c00eb61ee685037daefd3f6a9`;
  the untouched Lab worktree HEAD was `4426de4a2fc9fb0193edfdaa5fd25f6dc8f13745`.
- Root checkout at `/Users/arcades/Documents/GitHub/arcadeprofile` was observed
  dirty before this isolated worktree: modified `app/(frontend)/feed.xml/route.ts`,
  `app/(frontend)/projects/[slug]/[postSlug]/page.tsx`, and `package.json`; untracked
  `app/components/MarkdownEssay.tsx`, `lib/payload-essay-import.ts`,
  `lib/static-essays.test.ts`, `lib/static-essays.ts`, and
  `scripts/import-payload-essays.ts`.
- Separate Lab worktree `/Users/arcades/.codex/worktrees/4f79/arcadeprofile` was
  observed dirty only in `.env.example`, `app/(frontend)/api/subscribe/route.ts`,
  `app/components/SubscribeCTA.tsx`, `lib/activecampaign.test.ts`,
  `lib/activecampaign.ts`, and `lib/subscribe-types.ts`, plus untracked
  `lib/subscribe-route.test.ts`. Neither checkout was modified, stashed, reset,
  cleaned, rebased, or used as an export target.
