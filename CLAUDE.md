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

## Syncing env vars to Vercel

To push a new env var to all three Vercel environments after adding it to `.env.local`:

```bash
# Production and Development work from the CLI:
vercel env add VAR_NAME production --value "$VALUE" --yes
vercel env add VAR_NAME development --value "$VALUE" --yes

# Preview is broken in CLI 53.1.0 — the documented "all preview branches"
# command (`vercel env add VAR preview --value V --yes`) errors with
# `git_branch_required` even though no branch should be required. Use the
# REST API as a workaround:
TOKEN=$(jq -r '.token' "$HOME/Library/Application Support/com.vercel.cli/auth.json")
ORG=$(jq -r '.orgId' .vercel/project.json)
PROJ=$(jq -r '.projectId' .vercel/project.json)
curl -sS -X POST "https://api.vercel.com/v10/projects/$PROJ/env?teamId=$ORG" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"key\":\"VAR_NAME\",\"value\":\"$VALUE\",\"type\":\"plain\",\"target\":[\"preview\"]}"
```

Verify with `vercel env ls`. Once the CLI bug is fixed (>53.1.0), drop the API workaround and use the CLI for all three targets.
