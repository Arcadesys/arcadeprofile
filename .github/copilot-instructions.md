# Copilot Instructions

## Commits
Write concise commit messages: a short imperative subject line (≤72 chars), no body unless the change is genuinely non-obvious.

## Scope discipline
Before starting work, confirm the task is a single, coherent feature. If the request bundles more than one independent feature, stop and ask which one to tackle first. One feature → one PR.

When a new idea surfaces mid-task (a "shiny object"), capture it as a GitHub issue rather than expanding the current PR.

## Stack
Next.js 15 + Payload CMS 3 + PostgreSQL, deployed on Vercel. TypeScript throughout.

## Testing
Run `npm test` before marking work done. Lint with `npm run lint`.
