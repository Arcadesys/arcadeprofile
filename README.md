# Arcades Profile

The Arcades is a Next.js 16 and React 19 personal site, essay archive,
portfolio, collection, and set of browser toys. Public essays are validated
Markdown files in `content/posts/<group>/<slug>.md`; the private draft tree is
`content/drafts`.

## Local development

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The application has no database or CMS runtime. Vercel Blob URLs remain the
media and downloadable-edition storage layer.

## Publishing an essay

1. Add or edit a validated Markdown file in one of the six essay group folders.
2. Commit the file and merge it to `main`.
3. Verify the production Vercel deployment and public essay URL.

`publishDate` controls visibility. A future date does not create an automatic
schedule: publishing later requires a later commit and deployment.

## Essay newsletters

```bash
# Dry run (default)
npm run newsletter:post -- --slug <slug>

# Explicit preview
npm run newsletter:post -- --slug <slug> --preview-to reader@example.com

# Schedule a Kit broadcast after the production URL returns 200
npm run newsletter:post -- --slug <slug> --send
```

Broadcasts target Kit's `ArcadeProfile: All Writing` OR
`ArcadeProfile: Essays` tags. Kit sends one copy to each matching active
subscriber. Non-PII receipts live in `data/newsletter-sends`; an ambiguous
pending request must be reconciled in Kit before it can be retried. A completed
essay cannot be sent again without:

```bash
npm run newsletter:post -- --slug <slug> --send --resend --reason "why"
```

`/api/subscribe` submits to the selected Kit double opt-in forms. Kit applies
audience tags through its form confirmation rules. Set `KIT_API_SECRET` and
`KIT_FORM_ALL_ID`, `KIT_FORM_FICTION_ID`, `KIT_FORM_ESSAYS_ID`, and
`KIT_FORM_LAB_ID` in the runtime environment. `KIT_API_KEY`,
`KIT_TAG_ALL_WRITING_ID`, and `KIT_TAG_ESSAYS_ID` are used by the newsletter
sender. Postmark is used only for an explicitly addressed preview.
