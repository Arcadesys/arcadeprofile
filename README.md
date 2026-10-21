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

## Email subscriptions and essay newsletters

The first-party subscription flow sends one verification email. No provider write happens until the reader presses Confirm. Resend Contacts store subscriber state; seven Resend Topics store the selected preferences. Topic selection is additive. Unsubscribe is global for that address, and suppressed contacts are never resubscribed.

```sh
# Dry run (default)
npm run newsletter:post -- --slug <slug>

# Explicit preview to an approved address
npm run newsletter:post -- --slug <slug> --preview-to reader@example.com

# Verify production URL, create a draft, and schedule the broadcast
npm run newsletter:post -- --slug <slug> --send
```

The CLI targets a broad configured Resend segment of confirmed contacts and scopes every broadcast to the Essays topic so topic opt-outs are respected. All Writing signup consent also opts into Fiction and Essays Topics. Receipts under `data/newsletter-sends` are non-PII; reconcile ambiguous requests in Resend before retrying. For Resend configuration, API permissions, migration, and cutover, read [`docs/email-service-migration.md`](docs/email-service-migration.md) and [`docs/kit-removal-runbook.md`](docs/kit-removal-runbook.md).

The Kit-removal PR must not merge until the owner completes the import and verifies counts. Migration scripts run only from the owner's main checkout; they do not run in the application or deployment.
