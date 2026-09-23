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

`/api/subscribe` looks up the exact Kit status, then stores a 24-hour challenge
and sends one Postmark confirmation email for all selected preferences. It
makes no Kit writes before the reader presses Confirm on
`/subscribe/verify`. The signed token lives in the URL fragment, is cleared
before rendering, and is submitted only by that explicit button. A Cancel
button can discard an unclaimed request. Suppressed Kit states receive no
verification email or Kit writes. Pending Redis data includes an AES-GCM
encrypted email address and the selected audiences; the email uses `SIGNUP_LINK_SECRET`
while in Redis. After Kit returns a subscriber ID, the email ciphertext is
removed and only Kit subscriber ID and selected audiences remain for up to 30
days. A keyed ten-minute Redis cooldown
coalesces repeat requests for the same email and audience bundle; an ambiguous
Postmark response does not trigger an immediate duplicate email.

On explicit confirmation, an already-active Kit subscriber receives the
selected form memberships and audience tags. A new or inactive subscriber is
created or reused as inactive and added to each selected double-opt-in form.
Kit may send a second confirmation email for new or inactive contacts. The
daily authenticated Vercel cron at `/api/kit/reconcile-confirmations` reads
only Redis records created by successful signed confirmation POSTs, rechecks
Kit's subscriber state, and tags only those recorded selections after Kit
reports active. It never infers preferences from raw Kit form-member listings.
Configure `KIT_API_KEY`, `CRON_SECRET`, the four form and audience tag IDs,
`KIT_TAG_ARCADEPROFILE_ID`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN` (or Vercel Upstash `KV_REST_API_URL` and
`KV_REST_API_TOKEN`), `SIGNUP_LINK_SECRET`, and Postmark sender values in
`.env.example`. Kit Free can delay tags until the next daily cron. No mailing
is sent to imported contacts unless they submit the signup form and claim its
confirmation link.

Postmark sends signup verification emails and explicitly addressed previews.
