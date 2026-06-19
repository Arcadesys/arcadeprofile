# Copilot Instructions

## Commits
Write concise commit messages: a short imperative subject line (≤72 chars), no body unless the change is genuinely non-obvious.

## Scope discipline
Before starting work, confirm the task is a single, coherent feature. If the request bundles more than one independent feature, stop and ask which one to tackle first. One feature → one PR.

When a new idea surfaces mid-task (a "shiny object"), capture it as a GitHub issue rather than expanding the current PR.

## Stack
Next.js 15 App Router + React 19 + Payload CMS 3 + PostgreSQL, deployed on Vercel. TypeScript throughout. Package manager is npm only.

Postmark is the outbound email delivery layer for Payload auth mail, transactional/test sends, preview sends, and per-post newsletters. ActiveCampaign owns marketing contacts, audience lists, subscription state, segmentation, consent, and marketing automation state. Do not add new ActiveCampaign campaign/email sends for site newsletters.

Custom API routes live under `app/(frontend)/api/`. Do not add hand-written routes under `app/(payload)/api/`; that route group is for Payload admin and Payload's catch-all API.

Posts use `publish_status: draft | scheduled | published | sent`. Public post queries should include both `published` and `sent`; prefer `publicPostStatusWhere()` from `lib/post-status.ts`. Post URLs should use `buildPostUrl()` / `buildGroupIntroUrl()` from `lib/post-url.ts`.

Collection schema changes require a migration under `migrations/` and registration in `migrations/index.ts`. `payload-types.ts` is generated; do not edit it by hand.

## Testing
Run `npm test` before marking work done. Lint with `npm run lint`; CI also typechecks with `npx tsc --noEmit`.
