# Kernel Panic — ArcadeProfile cover package

Concept C: Geoff, Jamie, and CeeCee wait around a glowing phone, with tea and cookies. CeeCee has floppy canine ears. This is the standalone cover selected for packaging, with the original image bytes preserved.

![Kernel Panic cover: three friends wait around a glowing phone, with CeeCee’s floppy canine ears visible.](assets/kernel-panic-cover.png)

## Included

- `assets/kernel-panic-cover.png` — 992 × 1586 portrait PNG, including title, series subtitle, and byline.
- `alt-text.txt` — ready-to-use accessible description.
- `cover-manifest.json` — measured dimensions, file size, SHA-256, provenance, suggested media ID, and target information.

This is a cover handoff, not a chapter release. No upload or deployment has been performed. It contains no manuscript or chapter PDF.

## Upload using ArcadeProfile's existing workflow

From the ArcadeProfile repository root, set `COVER_PACKAGE="$PWD/docs/releases/kernel-panic"`. With the site's existing `BLOB_READ_WRITE_TOKEN` available in the environment, run:

```sh
npm run upload:image -- "$COVER_PACKAGE/assets/kernel-panic-cover.png" --id kernel-panic-cover --alt "$(cat "$COVER_PACKAGE/alt-text.txt")" --used-in kernel-panic
```

The existing uploader writes the image to Vercel Blob using its content hash, records the returned URL and actual dimensions in `content/media/library.json`, and prints reusable Markdown. Use that returned URL; this package deliberately supplies no invented public URL or catalog entry with a placeholder URL. Do not expose the token in content or commits.

## Wire the image into the chapter

The inspected ArcadeProfile checkout is `179f8cf6056318ad38c7d353f292cc0bc81c5466`. Recheck these locations against the working branch before implementation:

- `lib/zoo-collection.ts`: chapter reader images currently use `ZOO_HERO` inside `zooChapterToEditorialPiece`. Add an optional per-chapter cover lookup and retain the collection cover as the fallback.
- `app/(frontend)/novels/it-takes-a-zoo/[chapter]/page.tsx`: chapter thumbnails, Open Graph images, and Twitter images also use `ZOO_HERO`. Resolve the same per-chapter image here so the reader and metadata agree.
- Keep `lib/zoo-collection-meta.ts` and the collection landing page's general cover intact. This artwork belongs to Kernel Panic.
- The inspected chapter registry ends with Follower Count. Registering Kernel Panic as a public chapter additionally requires the approved manuscript in `content/novels/it-takes-a-zoo/kernel-panic.md`, the next reader order (9 in the inspected eight-chapter reader), its PDF asset in `data/zoo-collection-assets.json`, and updates to the chapter expectations and affected collection tests. Manuscript chapter number 10 is distinct from reader order 9. These release materials are outside this cover package.

## Display and accessibility

Preserve the portrait aspect ratio and all three characters. Use `object-fit: contain` for constrained cover slots; a centered landscape crop will cut away the title or the people. For a social image requiring landscape dimensions, create a separate approved layout rather than cropping this portrait blindly. Use the supplied description where the image conveys information. A decorative thumbnail beside the same title can use empty alt text following the existing reader convention.

Keep the cream serif title, orange dash, blue shadows, and amber light. The humans remain human; CeeCee has two floppy canine ears and a tail.

## Integration checks

After implementation, check the chapter thumbnail, reader image, Open Graph/Twitter metadata, alt text, and mobile rendering. Confirm existing chapters still use their original cover fallback. Run the repository's required checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

No live URL or publication status is asserted by this package.
