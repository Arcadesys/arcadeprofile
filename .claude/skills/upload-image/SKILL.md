---
name: upload-image
description: Upload an image to the Payload Media collection (stored in Vercel Blob) via MCP `upload_image`, prompting for alt text and an optional caption. Use when the user says "/upload-image", "upload this image", "put this in blob", or hands over an image file or attachment without specifying a post to embed it into. For one-shot upload-and-embed-into-an-existing-post, use the MCP `upload_and_embed_image` tool directly or the `/post` skill instead.
---

# upload-image

Thin wrapper around the Payload MCP `upload_image` tool. Files land in the `media` collection, which is backed by the `@payloadcms/storage-vercel-blob` adapter — so a successful upload writes both a Payload Media doc and the underlying Vercel Blob object.

## Inputs

One of:

- **Attached image** — the user drops an image into the chat. Use the temp path the harness gives you.
- **Local file path** — absolute or relative. If relative, resolve against the current working directory before calling the tool.

If no image is provided, ask for one and stop. Do **not** invent a path or pick a placeholder.

Accepted extensions (matches `uploadImageFile` in `mcp/tools.ts`): `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`. Reject anything else with a short message — Payload will accept it but the MIME falls back to `application/octet-stream` and the site's image pipeline (og/card sizes) won't run.

## Always prompt for alt + caption

Before uploading:

1. Ask **"Alt text?"** — required. Don't accept an empty string. Alt text is for accessibility, not SEO; describe what's in the image, not what it's for. If the user insists the image is decorative, accept `""` and note that the Media doc will have empty alt.
2. Ask **"Caption? (optional)"** — accept empty.

Show both back as a short confirmation block before calling the tool.

## Upload

Call MCP `upload_image` with:

- `filePath`: the absolute path to the image.
- `alt`: the alt text from above.
- `caption`: the caption, if provided.

If MCP returns `ENOENT`, a sandbox read error, or any "filePath not supported" error (the hosted MCP refuses `filePath`), fall back to curl against the local dev server. Per project memory, the MCP sandbox sometimes blocks file reads:

```bash
curl -F file=@<absolute-path> \
     -F alt="<alt>" \
     -F caption="<caption>" \
     -H "Authorization: users API-Key $PAYLOAD_API_KEY" \
     http://localhost:3000/api/media
```

The dev server must be running (`npm run dev`). If it isn't, ask the user to start it rather than starting it yourself — they may have other work in that terminal.

## Output

After a successful upload, print:

- **Media id** — the integer from `doc.id`.
- **Blob URL** — `doc.url` from the response (the public Vercel Blob URL).
- **Filename** — `doc.filename` (Payload may have rewritten it).
- **Admin URL** — `/admin/collections/media/<id>`.
- **Embed placeholder** — `![media:<id>]()` on its own line. Mention that this is what gets pasted into a post body to embed the image (the `create_post` / `update_post` handlers resolve it to a Lexical upload node; raw `![alt](url)` markdown is not converted).

## What this skill does **not** do

- Does not embed the image into a post. For that, hand off to MCP `upload_and_embed_image` (one-shot) or `/post` (new post with image).
- Does not bulk-upload directories. One file per invocation.
- Does not upload directly via `@vercel/blob`'s `put()`. Going through Payload Media keeps alt text, generates og/card sizes, and gives you a stable media id — bypassing Payload would skip all of that.

## Tools

- MCP `upload_image` (write) — primary call.
- Bash `curl` — fallback when the MCP sandbox blocks the file read.
