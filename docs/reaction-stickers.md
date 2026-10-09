# Reaction Stickers on ArcadeProfile

Reaction Stickers is a **Tools** project under Watch me build. Its deliverable is a reusable creative workflow; the demo prepares a prompt that visitors run in their own chat app.

- Project: `/projects/reaction-stickers` (repository group manifest).
- Demo: `/reaction-stickers` (rewrite to `public/reaction-stickers/index.html`).
- Visitor publisher: `/reaction-stickers/publish.html` with Telegram sign-in and a server-side Bot API route.
- Inline chat prototype: `chat-app/` and `scripts/reaction-stickers-chat-server.mjs` expose the prompt grid as an MCP Apps widget.
- Download/media source of truth: `data/reaction-stickers-assets.json`, with public Blob URLs and SHA-256 hashes.
- The full standalone source download includes the unchanged skill, plugin manifest, package builder, and focused tests. Its URL is recorded under `source.zip` in the asset manifest.

## Maintenance

The prompt demo remains static and requires no inference credentials. Its local script and style paths are absolute under `/reaction-stickers/`. Images/downloads follow the site's Blob convention. Blob download links use `?download=1` to request an attachment across origins.

For a workflow update, use the full source package: edit the skill, run `python3 scripts/build.py`, its Python/Node checks, and the skill/plugin validators. Upload changed files to content-addressed paths in `arcadeprofile-blob`, record the new URL/hash pairs, and update the static page and group resources together. Preserve the original files and do not bundle private references or service credentials.

For a demo-only edit, edit `public/reaction-stickers/` directly. Keep the single default reaction list and scaffold in `workflow.js`; it is generated from the skill in the standalone source. Keep published downloads and the source archive aligned if behavior changes.

## Verification

Run the repository's `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Inspect the project index's Tools filter, project CTA, demo at desktop and narrow widths, reference download, invalid/custom reactions, label toggle, keyboard focus, and prompt copy. Verify public asset bytes against the recorded hashes after release.

Generation and installation in a recipient's ChatGPT account depend on their account features and remain separate from validating the static demo. The page explains those limits and offers a standalone prompt fallback.

## Inline chat prompt grid

The existing static demo is a web page. The chat prototype returns a `text/html;profile=mcp-app` UI resource from a read-only `open_sticker_prompt_grid` tool, so compatible chat hosts can show the builder beside the conversation. The widget reuses `public/reaction-stickers/workflow.js` and `prompt.js` at build time; the default reactions and prompt stay aligned with the skill. It builds prompts locally in the iframe. **Send prompt to chat** uses the MCP Apps `ui/message` bridge only after the visitor presses it. **Copy prompt** works when the chat bridge is unavailable. Character images are attached in the user's chat, not uploaded to this server. The Telegram option prepares a prompt and links to the separate publisher; the widget cannot publish a set.

From the repository root, run `npm install` and `npm run sticker-chat:serve`. The local widget preview is `http://127.0.0.1:8788/preview`; the MCP endpoint is `http://127.0.0.1:8788/mcp`. Change `PORT` and `HOST` if needed. `npm run sticker-chat:build` creates `chat-app/dist/widget.html`; it is generated and ignored by Git. The server reads the generated file at startup, so restart it after editing the widget or shared prompt files.

For a private ChatGPT web test, expose port 8788 through an HTTPS tunnel, connect its `/mcp` URL in ChatGPT Developer Mode, select the app in a new chat, and ask to “open the sticker prompt grid.” [The official quickstart](https://developers.openai.com/apps-sdk/quickstart) describes the current connection flow. Test that the widget appears, ten reactions render, edits update the prompt, and **Send prompt to chat** sends only the reviewed text. A local `/preview` check cannot prove that ChatGPT rendered the iframe or accepted `ui/message`.

For general web users, deploy this MCP server at a stable public HTTPS endpoint and follow the [plugin submission and publishing flow](https://developers.openai.com/apps-sdk/deploy/submission). A downloadable skill or plugin ZIP does not by itself make an inline widget appear in another person's chat. This prototype has not been connected to or published through ChatGPT. If the widget contract changes, bump its `ui://reaction-stickers/prompt-grid-v1.html` resource URI and the matching tool metadata.

## Visual system

The demo uses warm paper, forest text, mint work surfaces, and orange primary actions. Rounded system headings keep it dependency-free. The robot reference has a separate full-width section; the prompt form and handoff share one mint workspace. Install instructions use native keyboard-accessible disclosures, with the account-availability note always visible.

Keep body copy at 20px, controls at least 48px high, a distinct focus outline, reduced-motion support, and the single-column reflow below 800px. The published standalone source archive includes the same presentation with relative asset paths for local hosting.

The theme follows the device preference with `prefers-color-scheme: dark` and `color-scheme: light dark`. Shared color tokens cover text, fields, focus, selected/error/disabled states, and surfaces; CSS responds immediately if the preference changes. The original reference and sticker images keep their original colors. No theme setting or browser storage is needed. Verify both system themes when changing these tokens.

## Optional Telegram publication

Version 0.3.0 adds an included local Telegram Bot API upload script beside the optional connected Bunch route. The JPG preview still needs no account. A Telegram set needs individually validated transparent PNGs. The separate site publisher lets a visitor sign in with Telegram and upload ten PNGs to a set owned by that Telegram account. It uses the same `@stickerslopbot` through a server-side token, with Telegram OIDC identity, a short signed session, exact ordered files, a deliberate Publish button, Redis upload limits, and Telegram readback. The images are held only during the request and sent to Telegram; this site does not host inference. The local script and Bunch routes remain available.

## Visitor publisher setup

Keep the public uploader disabled until all of these are configured in ArcadeProfile Production: `REACTION_STICKERS_TELEGRAM_BOT_TOKEN`, `REACTION_STICKERS_TELEGRAM_CLIENT_ID`, `REACTION_STICKERS_TELEGRAM_CLIENT_SECRET`, and Upstash Redis REST URL/token (existing `UPSTASH_REDIS_REST_*` or `KV_REST_API_*`). `REACTION_STICKERS_PUBLIC_ORIGIN` defaults to `https://www.thearcades.me`. Never put secrets in the repository or a browser field. Bot token identity must match client ID and `@stickerslopbot`; a wrong bot fails closed.

In @BotFather's **Login Widget** settings for `@stickerslopbot`, add `https://www.thearcades.me` and `https://www.thearcades.me/api/reaction-stickers/telegram/callback` as Allowed URLs. Use the Client ID and Client Secret shown there. Add these URLs alongside Bunch's existing entries; do not replace them. Telegram OIDC uses a one-time state, PKCE, nonce, signed ID token, and a bot-access check. The visitor must start the bot in Telegram before signing in.

The site shows ten standard reaction slots; visitors with custom reactions can use the same positions and edit each Telegram emoji. Every file must be a transparent static PNG with one side exactly 512px, no larger than 512 KiB; the total request is capped at 3.8 MB to stay below the hosting upload limit. Upload attempts are limited per Telegram account and globally. The publisher does not read Bunch accounts or images and does not modify Bunch's webhook. It does not generate the PNGs: visitors download those from their own chat and choose them in the publisher.

Verify a second real Telegram account and an actual ten-sticker pack before calling the hosted visitor flow complete. A local test with mocked Telegram responses, a deployment, or a disabled publisher page is only partial evidence. If creation returns uncertain, inspect the exact pack name before any retry.

## Telegram choice in the demo

The workshop defaults to JPG preview. Selecting Telegram reveals an optional pack title, the skill setup link, and three review/publish steps. The copied prompt requests ten transparent PNGs and points to the separate visitor publisher; it never asks for a bot token. The prompt page itself still has no upload fields. Keep this branch aligned in the standalone `demo/prompt.js` and hosted `public/reaction-stickers/prompt.js` when publishing a new download.
