---
name: upload-image
description: Upload an image to Vercel Blob and return its public URL plus a ready-to-paste Markdown embed, prompting for alt text. Use when the user says "/upload-image", "upload this image", "put this in blob", or hands over an image file or attachment.
---

# upload-image

Uploads one image to Vercel Blob with `put()` from `@vercel/blob` and hands back the public URL. There is no Media collection and no admin UI — a blob URL pasted into frontmatter or body Markdown is the whole mechanism.

## Inputs

One of:

- **Attached image** — the user drops an image into the chat. Use the temp path the harness gives you.
- **Local file path** — absolute or relative. If relative, resolve against the current working directory first.

If no image is provided, ask for one and stop. Do **not** invent a path or pick a placeholder.

Accepted extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`. Reject anything else with a short message and set an explicit `contentType` on upload — blob will not infer it reliably.

## Always prompt for alt text

Before uploading, ask **"Alt text?"** — required, and don't accept an empty string.

Alt text is for accessibility, not SEO: describe what's in the image, not what it's for. Two reasons it is not optional here:

1. `hero.alt` is a required field whenever `hero` is present in post frontmatter — the schema rejects a hero without it.
2. `lib/markdown-render.ts` only converts `![alt](url)` when the alt is non-empty. `![](url)` falls through and renders as literal text on the page.

There is no caption field anywhere in the schema. If the user wants a caption, write it as a line of body Markdown under the image — don't promise a field that doesn't exist.

Show the alt text back as a short confirmation before uploading.

## Upload

Run the project's upload script. It resolves the MIME type from the extension, refuses anything unsupported, and prints the URL plus ready-to-paste snippets:

```bash
npm run upload:image -- <absolute-path> --alt "<alt text>"
```

Requires `BLOB_READ_WRITE_TOKEN` in the environment (see `.env.example`). If it's unset the script says so and exits — don't fall back to a local dev server, there is no upload route.

Uploads are **content-addressed**, matching `scripts/generate-portfolio-content.ts`: the sha256 goes in the path and `addRandomSuffix` is `false`, so re-uploading identical bytes overwrites the same address instead of minting a new URL and drifting previously-published links.

## Output

After a successful upload, print:

- **Blob URL** — the public URL from `put()`.
- **Markdown embed** — `![<alt>](<url>)` on its own line, for pasting into a post body.
- **Hero frontmatter** — the block to paste into a post's frontmatter:

  ```yaml
  hero:
    src: '<url>'
    alt: '<alt>'
  ```

## What this skill does **not** do

- Does not edit a post. Hand the URL back and let `/post` or the user place it.
- Does not bulk-upload directories. One file per invocation.
- Does not generate og/card sizes. The old Media collection did; blob does not. If a post needs a differently-sized image, upload that size as its own file.
- Does not commit anything. The blob is written immediately and lives outside git; only the URL you paste into a Markdown file is versioned.

## Tools

- Bash `npm run upload:image` (`scripts/upload-image.ts`) — the upload itself.
