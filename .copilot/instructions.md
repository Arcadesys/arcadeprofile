# GitHub Copilot Instructions

This repository is the **Arcades Profile** — a personal site and portfolio.

## Tech stack
- **Next.js 16** (App Router) + **React 19**
- **Markdown content** in the repo — no database, no CMS
- **Tailwind CSS** + SASS for styling
- **TypeScript** (strict mode)
- **Vercel** for deployment
- **Postmark** for transactional email; **Kit** (via the standalone `services/email` service) for newsletter contacts and preferences — not yet deployed, see `docs/email-service-migration.md`

## Package manager
Use **npm** exclusively. Never suggest `yarn`, `pnpm`, or `bun` commands.

## Key commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — run tests (`tsx --test` over `lib/` and `scripts/`)
- `npm run newsletter:post -- --slug <slug>` — essay newsletter harness (dry run by default)

## Conventions
- App Router pages live under `app/(frontend)/`; custom API routes under `app/(frontend)/api/`
- Public essays are `content/posts/<group>/<slug>.md` with a `_group.json` manifest per group
- Private drafts live in `content/drafts` and are never served
- Frontmatter is strict and validated by `lib/markdown-posts.ts`; `publishDate` is the only visibility control
- Shared utilities live in `lib/`
- Never commit `.env` or `.env.local` — use `.env.example` as reference
- TypeScript strict mode: avoid `any`

## Environment variables
Documented in `.env.example`. Key secrets: `POSTMARK_SERVER_TOKEN`, `EMAIL_SERVICE_URL`/`EMAIL_SERVICE_SUBSCRIBE_KEY`/`EMAIL_SERVICE_ADMIN_KEY`, `BLOB_READ_WRITE_TOKEN`.
