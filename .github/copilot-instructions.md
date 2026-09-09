# Copilot Instructions

## Commits
Write concise commit messages: a short imperative subject line (≤72 chars), no body unless the change is genuinely non-obvious.

## Scope discipline
Before starting work, confirm the task is a single, coherent feature. If the request bundles more than one independent feature, stop and ask which one to tackle first. One feature → one PR.

When a new idea surfaces mid-task (a "shiny object"), capture it as a GitHub issue rather than expanding the current PR.

## Stack
Next.js 16 App Router + React 19, deployed on Vercel. TypeScript throughout. Package manager is npm only. There is no database and no CMS: public essays are validated Markdown under `content/posts/<group>/<slug>.md`, with a `_group.json` manifest per group.

Postmark is the outbound email delivery layer for transactional/test sends and manual essay newsletters. ActiveCampaign owns marketing contacts, audience lists, subscription state, segmentation, consent, and marketing automation state. Do not add new ActiveCampaign campaign/email sends for site newsletters.

Custom API routes live under `app/(frontend)/api/`.

Posts have no status field. `publishDate` in the frontmatter is the only public visibility control — `selectPublicMarkdownPosts()` in `lib/markdown-posts.ts` hides future-dated files, so publishing a future-dated post requires a later commit and deployment. There is no scheduler, no preview-token backend, and no draft/scheduled/published/sent state machine. Post URLs should use `buildPostUrl()` / `buildGroupIntroUrl()` from `lib/post-url.ts`.

Frontmatter is strict and validated by `lib/markdown-posts.ts`; an invalid file fails the build rather than being skipped. A post's `group` frontmatter must match its directory name.

## Testing
Run `npm test` before marking work done. Lint with `npm run lint`; CI also typechecks with `npx tsc --noEmit`.
