# Agent Guidelines

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **CMS:** Payload CMS v3 (PostgreSQL via `@payloadcms/db-postgres`)
- **Styling:** Tailwind CSS + SASS
- **Language:** TypeScript (strict)
- **Email:** Postmark (`@payloadcms/email-nodemailer`)
- **Deployment:** Vercel
- **MCP Server:** `mcp/payload-mcp.ts` — exposes Payload collections as tools over stdio and HTTP/SSE

## Package Manager

This project uses **npm** exclusively. Do **not** use `yarn`, `pnpm`, `bun`, or any other package manager.

- Install dependencies: `npm install`
- Run the dev server: `npm run dev`
- Run a script: `npm run <script>`

There is no `yarn.lock`, `.yarnrc`, `pnpm-lock.yaml`, or `bun.lockb` in this repo — keep it that way. If you see `yarn`, `pnpm`, or `bun` commands anywhere in generated code, PRs, or documentation, replace them with their `npm` equivalents.

Do **not** add `yarn` (or `pnpm`, `bun`) as a dependency in `package.json`.

## Key Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Run tests | `npm test` |
| Run MCP server | `npm run mcp` |
| Seed database | `npm run seed` |

## Environment Variables

Required vars are documented in `.env.example`. Never commit secrets. Key vars:

- `DATABASE_URL` — PostgreSQL connection string
- `PAYLOAD_SECRET` — Payload CMS encryption secret
- `PAYLOAD_API_KEY` — API key for MCP server (local stdio)
- `MCP_API_KEY` — API key for HTTP MCP endpoint (separate from PAYLOAD_API_KEY)
- `POSTMARK_SERVER_TOKEN` — Postmark SMTP token for email
- `POSTMARK_FROM_EMAIL` — Sender address

## Project Structure

```
app/          Next.js App Router pages and API routes
collections/  Payload CMS collection configs
components/   React components
content/      Static markdown content
lib/          Shared utilities and helpers
mcp/          Payload MCP server (stdio + HTTP/SSE)
migrations/   Payload database migrations
scripts/      Seed and utility scripts
```

## Guidelines

- Keep changes minimal and targeted — do not refactor unrelated code.
- Run `npm run lint` and `npm test` before considering a task complete.
- All new API routes live under `app/api/`.
- Payload collections are defined in `collections/` and registered in `payload.config.ts`.
- Never commit `.env` or `.env.local` files.
