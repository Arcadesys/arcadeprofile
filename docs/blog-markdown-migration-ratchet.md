# Markdown publishing contract

## Current best

The public essay archive is fully repository-owned Markdown. Exactly 32 public
essays live in six groups:

- AI Art Experiments: 2
- Arcade Blog: 4
- On Writing: 2
- Pride Essays: 5
- The Singularity Log: 18
- White Cane Chronicles: 1

`The Fox and the Eval` remains private under `content/drafts`.

## Visibility

`publishDate` is the sole visibility control. Public loaders, RSS, sitemap,
Latest, Projects, related reading, metadata, Open Graph images, and generated
PDFs all consume the same validated Markdown corpus.

Future-dated essays remain hidden until a later commit and deployment. There is
no automatic scheduler, secret preview route, reaction store, or webhook ledger.

## Publishing loop

1. Validate the Markdown file and group manifest.
2. Commit and merge to `main`.
3. Verify the Vercel deployment and public URL.
4. Optionally use `npm run newsletter:post -- --slug <slug>`.

The newsletter command is dry-run by default, accepts only the six essay groups,
and always targets ActiveCampaign All + Essays. Postmark sends previews and
broadcasts. Non-PII receipts under `data/newsletter-sends` prevent accidental
duplicates and support metadata-based resume.
