# Reaction Stickers on ArcadeProfile

Reaction Stickers is a **Tools** project under Watch me build. Its deliverable is a reusable creative workflow; the demo prepares a prompt that visitors run in their own chat app.

- Project: `/projects/reaction-stickers` (repository group manifest).
- Demo: `/reaction-stickers` (rewrite to `public/reaction-stickers/index.html`).
- Download/media source of truth: `data/reaction-stickers-assets.json`, with public Blob URLs and SHA-256 hashes.
- The full standalone source download includes the unchanged skill, plugin manifest, package builder, and focused tests. Its URL is recorded under `source.zip` in the asset manifest.

## Maintenance

The five static demo files need no framework, backend, environment variables, or inference credentials. Their local script and style paths are absolute under `/reaction-stickers/`, so the rewritten route and direct HTML file both work. Images/downloads follow the site's Blob convention. Blob download links use `?download=1` to request an attachment across origins.

For a workflow update, use the full source package: edit the skill, run `python3 scripts/build.py`, its Python/Node checks, and the skill/plugin validators. Upload changed files to content-addressed paths in `arcadeprofile-blob`, record the new URL/hash pairs, and update the static page and group resources together. Preserve the original files and do not bundle private references or service credentials.

For a demo-only edit, edit `public/reaction-stickers/` directly. Keep the single default reaction list and scaffold in `workflow.js`; it is generated from the skill in the standalone source. Keep published downloads and the source archive aligned if behavior changes.

## Verification

Run the repository's `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Inspect the project index's Tools filter, project CTA, demo at desktop and narrow widths, reference download, invalid/custom reactions, label toggle, keyboard focus, and prompt copy. Verify public asset bytes against the recorded hashes after release.

Generation and installation in a recipient's ChatGPT account depend on their account features and remain separate from validating the static demo. The page explains those limits and offers a standalone prompt fallback.

## Visual system

The demo uses warm paper, forest text, mint work surfaces, and orange primary actions. Rounded system headings keep it dependency-free. The robot reference has a separate full-width section; the prompt form and handoff share one mint workspace. Install instructions use native keyboard-accessible disclosures, with the account-availability note always visible.

Keep body copy at 20px, controls at least 48px high, a distinct focus outline, reduced-motion support, and the single-column reflow below 800px. The published standalone source archive includes the same presentation with relative asset paths for local hosting.

The theme follows the device preference with `prefers-color-scheme: dark` and `color-scheme: light dark`. Shared color tokens cover text, fields, focus, selected/error/disabled states, and surfaces; CSS responds immediately if the preference changes. The original reference and sticker images keep their original colors. No theme setting or browser storage is needed. Verify both system themes when changing these tokens.
