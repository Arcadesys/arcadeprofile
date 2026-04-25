# Claude Project Instructions

This is the **Arcades Profile** — a personal site and portfolio built with Next.js 15, Payload CMS v3, and deployed on Vercel.

See [AGENTS.md](./AGENTS.md) for full agent guidelines including tech stack, commands, and environment variable documentation.

## Quick reference

- **Dev server:** `npm run dev` → http://localhost:3000
- **Lint:** `npm run lint`
- **Tests:** `npm test`
- **MCP server (stdio):** `npm run mcp`

## MCP integration

The repo ships a Payload CMS MCP server at `mcp/payload-mcp.ts`. The `.mcp.json` in the repo root configures it for Claude Code — set `PAYLOAD_API_URL` and `PAYLOAD_API_KEY` in your environment and it works out of the box.

The HTTP/SSE endpoint is live at `https://arcadeprofile.vercel.app/api/mcp`. To connect claude.ai:

1. Go to **Settings → Connectors → Add custom connector**
2. **URL:** `https://arcadeprofile.vercel.app/api/mcp`
3. **Auth header:** `Authorization: Bearer <MCP_API_KEY>`

## Key conventions

- Package manager: **npm only** (no yarn/pnpm/bun)
- TypeScript strict mode is enabled
- Payload collections live in `collections/`, registered in `payload.config.ts`
- All API routes live under `app/api/`
- Never commit `.env` or `.env.local`
