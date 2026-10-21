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

On explicit confirmation, an already-active Kit subscriber receives the
selected form memberships and audience tags. A new or inactive subscriber is
created or reused as inactive and added to each selected double-opt-in form.
Kit may send a second confirmation email for new or inactive contacts. The approved Writing welcome is sent at most once per address, only after the reader claims the first-party verification link and Kit reports active. For multiple choices, one copy is selected in this order: All Writing, Fiction, Essays, Lab; every selected membership and tag remains intact. Imported contacts and DOI-pending subscribers do not receive the welcome. It includes an RFC 8058 one-click unsubscribe header and a linked fallback page; the page requires an explicit button, while the one-click POST updates Kit. Token pages are excluded from PostHog analytics.
daily authenticated Vercel cron at `/api/kit/reconcile-confirmations` reads
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

`lib/mail-transport.ts` sends signup verification emails, gated welcomes, and
explicitly addressed previews. `MAIL_PROVIDER` accepts `postmark` or `resend`;
unset/blank keeps Postmark. There is no fallback between providers. Missing or
invalid selected-provider credentials fail before signup Kit/Redis work or a
welcome claim.

For Postmark, keep `POSTMARK_SERVER_TOKEN` and `POSTMARK_FROM_EMAIL` (optional
`POSTMARK_FROM_NAME` and stream settings). For Resend, verify the sending domain,
disable its open/click tracking in Resend, then configure `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, optional `RESEND_FROM_NAME`, and `MAIL_PROVIDER=resend` in
Vercel production and redeploy. Merging this change alone keeps Postmark selected.
Never commit credentials. Both bodies and custom unsubscribe headers are retained.
Resend uses stable challenge/welcome/job idempotency keys where available; unknown
outcomes still retain local guards and never trigger automatic retries.
See [the migration contract](docs/email-service-migration.md) for response mapping,
operator cutover steps, quota behavior, and related-PR integration notes.

The historical `services/email` transactional path also uses this transport;
Kit broadcasts remain on Kit.
Writing welcome delivery is independently gated: set
`WRITING_WELCOME_ENABLED=true` only after review; unset or any other value
keeps the welcome inactive while signup confirmations and audience updates
continue.

## Standalone Kit emails

The Claude Code `/kit-email` skill prepares broadcasts beyond essays using Kit's
free-plan v4 REST API (no Kit MCP). Start offline:

```bash
npm run kit:email -- --file /absolute/path/email.md
# Section-based approval documents supply audience explicitly:
npm run kit:email -- --file /Users/arcades/.ao/data/artifacts/arcades-websites-4/launch-email-draft.md --audience all,essays,fiction
```

Use YAML `subject`, `preview`, `audience: [all, essays]` plus a Markdown body, or
labeled `## Subject`, `## Preview text`, `## Body` sections with `--audience`.
Dry run prints HTML/text and OR tag targeting, makes no requests or writes, and
works without credentials. Recipient estimate is unavailable offline; Kit's
broadcast stats report delivery counts rather than an unsaved tag-union estimate.

For an operator-authorized draft, add `--draft`; it creates and reads back
`send_at: null`, `public: false`, then prints a Kit edit link/ID. Separately approved
sending requires `--send --broadcast-id <id> --confirm "<exact subject>"`, a matching
local draft and provider readback, HTTP 200 for all body links, and optional future
`--send-at <ISO time>`. Default scheduling is one minute ahead. Previews use only
the shared explicitly addressed Postmark path with `--preview-to <approved-address>`.
Neither send nor preview is authorized by asking for a draft.

The CLI reads **`.env.kit.local`** (ignored/untracked). The operator must paste
`KIT_API_KEY` from Kit → Settings → Developer → V4 keys there; `vercel env pull`
returns redacted sensitive values. Never print or commit this file/key. Selected
writing tag IDs and approved-preview Postmark settings use the existing variable
names. No credential discovery or deployment configuration is performed.

See [.claude/skills/kit-email/SKILL.md](.claude/skills/kit-email/SKILL.md) for approval,
input, audience and recovery rules. Non-PII history is
`data/newsletter-sends/email-<subject-hash>.kit.json`; keep it in one controlled
workspace. Pending/ambiguous requests and stale locks require reconciliation,
never automatic retry. Intentional repeats need a new reviewed draft, and both
commands need `--resend --reason "<non-personal reason>"`. Subject changes, manual
sends and separate workspaces are not coordinated by this local guard.
