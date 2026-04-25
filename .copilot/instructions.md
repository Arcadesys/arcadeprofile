# GitHub Copilot Instructions

This repository is the **Arcades Profile** — a personal site and portfolio.

## Tech stack
- **Next.js 15** (App Router) + **React 19**
- **Payload CMS v3** (content management, PostgreSQL backend)
- **Tailwind CSS** + SASS for styling
- **TypeScript** (strict mode)
- **Vercel** for deployment
- **Postmark** for transactional email

## Package manager
Use **npm** exclusively. Never suggest `yarn`, `pnpm`, or `bun` commands.

## Key commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — run tests
- `npm run mcp` — start MCP server (stdio)

## Conventions
- All App Router pages and API routes live under `app/`
- Payload collections are in `collections/`, registered in `payload.config.ts`
- Shared utilities live in `lib/`
- Never commit `.env` or `.env.local` — use `.env.example` as reference
- TypeScript strict mode: avoid `any`

## Environment variables
Documented in `.env.example`. Key secrets: `PAYLOAD_SECRET`, `DATABASE_URL`, `POSTMARK_SERVER_TOKEN`, `MCP_API_KEY`, `PAYLOAD_API_KEY`.
