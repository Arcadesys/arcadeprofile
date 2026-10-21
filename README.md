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
and sends one confirmation email through the selected mail provider for all selected preferences. It
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
mail-provider response does not trigger an immediate duplicate email.

With `KIT_DIRECT_ACTIVE_SIGNUP` unset/false (the default), an already-active
Kit subscriber receives the
selected form memberships and audience tags. A new or inactive subscriber is
created or reused as inactive and added to each selected double-opt-in form.
Kit may send a second confirmation email for new or inactive contacts. The approved Writing welcome is sent at most once per address, only after the reader claims the first-party verification link and Kit reports active. For multiple choices, one copy is selected in this order: All Writing, Fiction, Essays, Lab; every selected membership and tag remains intact. Imported contacts and DOI-pending subscribers do not receive the welcome. It includes an RFC 8058 one-click unsubscribe header and a linked fallback page; the page requires an explicit button, while the one-click POST updates Kit. Token pages are excluded from PostHog analytics.
The daily authenticated Vercel cron at `/api/kit/reconcile-confirmations` reads
only Redis records created by successful signed confirmation POSTs, rechecks
Kit's subscriber state, and tags only those recorded selections after Kit
reports active. It never infers preferences from raw Kit form-member listings.
Configure `KIT_API_KEY`, `CRON_SECRET`, the four form and audience tag IDs,
`KIT_TAG_ARCADEPROFILE_ID`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN` (or Vercel Upstash `KV_REST_API_URL` and
`KV_REST_API_TOKEN`), `SIGNUP_LINK_SECRET`, and the selected mail-provider sender values in
`.env.example`. Kit Free can delay tags until the next daily cron. No mailing
is sent to imported contacts unless they submit the signup form and claim its
confirmation link.

`KIT_DIRECT_ACTIVE_SIGNUP=true` is a **draft, inactive option** for a single
first-party confirmation: only after the explicit Confirm POST, create a new
Kit subscriber with v4 `state: active` and add the selected audience tags
immediately. Existing active subscribers get additive tags. New/active signups
request no forms or Kit confirmation email and need no form IDs. Retain the
form IDs for inactive fallbacks and rollback.
The mode is pinned when confirmation starts, so retries do not switch flows.
The cron continues draining legacy/fallback DOI records and skips direct-mode records;
`first_party_verified` and `kit_active_ready` both advance on a successful direct
signup. The same #434 welcome dispatcher can enroll immediately if its separate
welcome gate is approved and enabled; its shared permanent dedupe prevents a
second enrollment.

Existing inactive contacts use the **approved legacy fallback**: selected DOI
forms, Kit's confirmation, then tags and the welcome only after the daily cron
observes active. They are never deleted/recreated or falsely activated by an
upsert. `kit_doi_fallback` counts these confirmed requests once in the existing
aggregate metrics (by first-party verification day), without storing new PII.
Fallback success copy explains that Kit may send one more confirmation email.
Asking Kit support whether inactive-to-active via API is possible is an open
follow-up, **not an activation blocker**. See the [API notes, consent evidence
and activation checklist](docs/email-service-migration.md#direct-active-signup-draft-default-off).
Keep this flag unset/false until the user approves activation. No provider,
configuration, flag changes or live sends are part of this draft. Changing the
Vercel flag later requires a new deployment so prerendered signup copy and the
server use the same configuration.


`lib/mail-transport.ts` sends signup verification emails, gated welcomes, and
explicitly addressed previews. `MAIL_PROVIDER` accepts `postmark` or `resend`;
unset/blank keeps Postmark. There is no fallback between providers. Missing or
invalid selected-provider credentials fail before signup Kit/Redis work or a
welcome claim.

Production has explicitly selected Resend, and the user confirmed receipt of a
signup confirmation from `austen@mail.thearcades.me`. Selected Resend config uses
`RESEND_API_KEY`, `RESEND_FROM_EMAIL` and optional `RESEND_FROM_NAME`; open/click
tracking must be disabled on the sending domain. The code default remains
Postmark for compatibility; its configuration is recorded in the migration
contract. Do not restore Postmark credentials or change provider selection for
this series. No environment values or account settings change in this PR.
Never commit credentials. Both bodies and custom unsubscribe headers are retained.
Resend uses stable challenge/welcome/job idempotency keys where available; unknown
outcomes still retain local guards and never trigger automatic retries.
See [the migration contract](docs/email-service-migration.md) for response mapping,
operator cutover steps, quota behavior, and related-PR integration notes.

The historical `services/email` transactional path also uses this transport;
Kit broadcasts remain on Kit.

`lib/mail-transport.ts` sends signup verification and explicitly addressed previews. The draft
three-email welcome series now runs in-house using Kit status reads, the selected mail provider,
Upstash and the existing daily `0 8 * * *` cron. No Kit Sequence or paid automation
is needed. At the same first-party-confirmed + Kit-active welcome points,
`lib/welcome-delivery.ts` dispatches one path; imported/DOI-pending contacts are
not bulk enrolled. The series shares legacy once-per-address dedupe, stores no
email address, and re-reads Kit by ID before each step (enrollment/day 3/day 7).
Records expire after 30 days; ambiguous sends are held, never blindly retried.

Both welcome flags remain off by default; no env values are changed:

- `WELCOME_SERIES_ENABLED=true`, legacy unset/false: series only.
- Both unset/false: no welcome enrollment or sends.
- Legacy `WRITING_WELCOME_ENABLED=true` alone: old single welcome only.
- Both true: conflict fails closed at dispatch/cron. Shared dedupe also prevents
  receiving both paths across configuration changes.

Keep `WRITING_WELCOME_ENABLED` unset/false. The series is **draft only** and must
stay disabled until the user approves the [activation checklist](docs/email-service-migration.md#activation-checklist--requires-separate-user-approval),
including sender authentication, selected-provider tracking/classification and plan volume, real gift
links and a separately approved single preview to the user's own inbox. No real
preview or test email is authorized here. Rough steady-state provider volume is
`4 × new eligible subscribers + approved preview recipients + other traffic`;
see the same document for quota and daily-capacity limits.

The series uses `sendMail()` with a stable `welcome-series/<digest>/step-<step>`
key. Different steps cannot collide; retries of the same step keep the same key.
The single welcome retains `writing-welcome/<digest>`. These provider keys
supplement Redis claims and never permit retrying uncertain outcomes.
