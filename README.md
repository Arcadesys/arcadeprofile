This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MCP Server

The repo ships a Payload CMS MCP server that exposes Posts, Pages, Groups, Books, and Projects as tools. It works over **stdio** (Claude Code / CLI) and **HTTP/SSE** (claude.ai web/mobile).

### Claude Code (stdio)

The `.mcp.json` in the repo root is pre-configured. Add your env vars and it just works:

```bash
PAYLOAD_API_URL=http://localhost:3000 PAYLOAD_API_KEY=<key> pnpm run mcp
```

### Connecting claude.ai as a custom connector

1. The HTTP endpoint is live at `https://arcadeprofile.vercel.app/api/mcp`
2. In claude.ai → **Settings → Connectors → Add custom connector**
3. **URL:** `https://arcadeprofile.vercel.app/api/mcp`
4. **Auth header name:** `Authorization`
5. **Auth header value:** `Bearer <MCP_API_KEY>` (value from Vercel env)

The `MCP_API_KEY` env var is separate from `PAYLOAD_API_KEY` — rotate them independently. Never commit either to the repo.

### Local HTTP smoke test

```bash
# List tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Create a test post (skipNewsletter suppresses Postmark send)
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","method":"tools/call","id":2,
    "params":{
      "name":"create_post",
      "arguments":{
        "title":"MCP Smoke Test",
        "excerpt":"Testing MCP create.",
        "content":"Body.",
        "skipNewsletter": true,
        "meta":{"title":"Smoke","description":"Test desc","keywords":"test"},
        "discoverability":{"social_hook":"hook","search_summary":"summary"}
      }
    }
  }'
```
