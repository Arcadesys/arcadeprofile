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

`/api/subscribe` creates one inactive Kit subscriber with `KIT_API_KEY`, then
requests membership on each selected double opt-in form. Each selected
preference sends its own confirmation email. Partial form failures are shown
separately and only failed preferences remain selected for retry.

Kit Free does not provide the Rules needed for post-confirmation audience tags.
The daily Vercel cron at `/api/kit/reconcile-confirmations` therefore reads all
cursor pages of active members for each writing form before making any tag
writes. It adds each audience tag only to active members of that form and uses
Kit's idempotent tag endpoint, so retries are safe. It requires server-only
`KIT_API_KEY`, `CRON_SECRET` (at least 16 characters), the four
`KIT_FORM_*_ID` values, `KIT_TAG_ALL_WRITING_ID`, and the remaining
`KIT_TAG_FICTION_ID`, `KIT_TAG_ESSAYS_ID`, and `KIT_TAG_LAB_ID` values shown in
`.env.example`. Vercel Hobby runs a cron once per day, so audience tagging may
take up to a day after confirmation. The signup route itself never applies
audience tags. Kit keeps cancelled contacts out of active-form results and
broadcast sends. If Kit reports that an address is already active, signup
does not add it to a newly selected form: Kit may treat that membership as
already confirmed without sending another form-specific confirmation email.
Postmark is used only for an explicitly addressed preview.
