# Email architecture and acceptance record

## Current source contract (updated 2026-10-20)

The active signup and essay-broadcast paths call Kit, the selected mail provider, and Redis
**directly**. They do not depend on deploying `services/email` or setting
`EMAIL_SERVICE_URL`. The earlier standalone-service cutover plan in this document
is superseded. This record describes source behavior; it does not establish that
production credentials, sender authentication, inbox delivery, or provider
configuration have been verified.

- **Kit** owns subscriber status, topic form memberships/tags, double opt-in, and
  essay broadcasts. Cancelled, bounced, and complained addresses are not
  reactivated by the signup flow.
- **Transactional mail** (`lib/mail-transport.ts`) sends explicitly addressed signup verification messages and CLI
  previews. It also implements the separately gated writing welcome.
- **Upstash Redis** (or the Vercel-injected compatible connection) owns short-lived
  signup challenges, cooldowns/claim leases, durable welcome deduplication, and
  aggregate confirmation counts.
- `lib/email-service.ts` and `services/email` remain historical code. In
  particular, `npm run postmark:test` and `npm run email:test` still invoke that
  legacy service through `scripts/send-test-email.ts`; they do **not** test the
  current direct provider preview or signup path. Use the explicitly addressed
  newsletter preview below for that CLI path.

Primary implementation: `app/(frontend)/api/subscribe/route.ts`,
`app/(frontend)/api/subscribe/verify/route.ts`, `lib/writing-signup.ts`,
`lib/kit-confirmation-reconciliation.ts`, `lib/writing-welcome-email.ts`,
`scripts/newsletter-post.ts`, and `lib/kit-broadcast.ts`.

## Provider selection and cutover

The only sending HTTP implementation is `lib/mail-transport.ts`. Signup,
welcome, explicit CLI previews, and the historical service transactional adapter
all call it. Kit broadcasts and legacy Postmark webhook ingestion are unchanged.
`MAIL_PROVIDER` accepts exactly `postmark` or `resend`; unset/blank keeps Postmark.
An unsupported value or missing selected-provider key/from address fails closed;
there is no fallback, dual send, or automatic retry. Signup validates sender
configuration before Kit/Redis calls; welcome validates before acquiring a claim;
the historical service validates before opening its store.

Postmark uses `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, optional
`POSTMARK_FROM_NAME`, and existing transactional/broadcast stream settings.
The historical service retains `EMAIL_FROM` as its Postmark sender. Resend uses
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_FROM_NAME`; no Postmark
sending credential is needed when Resend is selected. HTML, plain text, custom
headers (including both RFC 8058 headers), and service-request metadata remain.
Postmark streams remain unchanged. Resend records `message_stream` and `category`
tags (`signup-verification`, `writing-welcome`, `newsletter-preview`,
`legacy-transactional`); it uses the transactional API even for explicit previews.
Kit remains the broadcast provider.

Resend tracking is configured **per domain**, not per email: disable open and
click tracking in the domain dashboard before switching. The adapter cannot
prove dashboard settings with a sending-only key. Postmark verification/welcome
still explicitly send `TrackOpens: false` and `TrackLinks: None`.

Operator order (no step is performed by merging this PR):

1. The user has confirmed `mail.thearcades.me` is Verified in Resend and chosen
   `austen@mail.thearcades.me`. Recheck it remains Verified; keep tracking off.
2. Create a Sending-access key restricted to that domain. Add `RESEND_API_KEY`
   as a sensitive Vercel Production variable and `RESEND_FROM_EMAIL` with the
   chosen address; optionally set `RESEND_FROM_NAME=The Arcades`.
3. After merge and configuration, set `MAIL_PROVIDER=resend` in Production,
   redeploy, then test signup with your own address. Verify inbox receipt,
   explicit confirmation and the selected Kit memberships. Keep the welcome gate
   unchanged; do not activate it merely to test this migration.
4. Only after successful delivery, remove `POSTMARK_SERVER_TOKEN` from Vercel
   and retire old Postmark DKIM/`pm-bounces` records after checking other users.
   Preserve root iCloud MX/SPF and DMARC. No DNS or secret changes are part of this PR.

### Acceptance and uncertainty

`sendMail()` returns a provider message ID only with a valid positive receipt.
`MailRejectedError` means a definite refusal. `MailAmbiguousError` means unknown
outcome: retain the signup cooldown or permanent welcome claim. A compatibility
export `PostmarkRejectedError` aliases `MailRejectedError` for stacked callers;
new callers should import the neutral class directly. Errors contain no provider
body, recipient, token, secret, or original fetch error/cause.

- Postmark: HTTP 4xx and explicit numeric nonzero `ErrorCode` are refusals, as
  before. Missing/wrong-type `ErrorCode`, malformed JSON, missing message ID,
  network errors and 5xx are unknown. This closes the old missing-`ErrorCode`
  loophole that could release a guard on an incomplete receipt.
- Resend: documented validation/auth/permission/parameter errors (400, 401, 403,
  404, 405, 422) and named rate/daily/monthly quota errors (429) are refusals.
  Classification requires a documented name/status pair; malformed or unfamiliar
  responses remain unknown. HTTP 408, **both 409 idempotency conflicts**, 5xx,
  timeouts, missing receipts and invalid JSON remain unknown. A concurrent or
  conflicting keyed request can mean an earlier request already sent.
- Resend's `Idempotency-Key` lasts 24 hours. Verification keys hash the stable
  challenge token; welcome keys use the existing keyed address digest; service
  keys use the stable job ID. Neither raw tokens nor addresses are keys/tags.
  Explicit previews have no durable send identity and intentionally get no key.
  Idempotency supplements the existing Redis/SQLite guards; it does not replace
  them, shorten retention, reclaim leases or authorize retries after uncertainty.

Resend Free currently allows 100 emails/day and 3,000/month, counting previews
and enabled welcomes too; a signup is not necessarily the only mail for an
address. Daily quota resets at midnight UTC. Current default API rate limit is
10 requests/second per team (check the account's Usage page). Named 429 refusals
release signup/welcome guards; signup returns its existing generic failure and
welcome returns `rejected`. Nothing queues or automatically resends after quota
reset. A reader must retry once capacity returns. Uncertain requests keep their
existing guards and require reconciliation. Upgrade ahead of a launch spike or
accept delayed new signups; do not bypass guards to force a send.

Current provider references checked for this change:
[send API and custom headers](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[error names/status codes](https://resend.com/docs/api-reference/errors),
[rate and quota response headers](https://resend.com/docs/api-reference/rate-limit),
[account quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
[domain tracking](https://resend.com/changelog/update-click-open-tracking-via-api).

### Follow-up for existing PRs (branches unchanged)

- **#434**, based on #433: in `lib/writing-welcome-email.ts`, make
  `writingWelcomeSenderConfig()` delegate to `readMailConfig()` and replace the
  Postmark fetch in `sendWelcomeContent()` with `sendMail()`, preserving both
  unsubscribe headers, bodies and disabled tracking. Add a caller-supplied stable
  per-step key to that helper; in `lib/welcome-series.ts` pass a key containing
  the keyed digest **and series step**, so the three different messages do not
  collide within Resend's 24-hour window. Use `MailRejectedError` for its existing
  refusal transition; leave leases/uncertain states intact. Keep the once-only
  helper's digest key for the legacy single welcome. Adapt `lib/welcome-series.test.ts`
  for both providers and missing/unknown receipts, and reconcile its README/docs edits.
- **#435**: replace `lib/postmark-preview.ts`'s request with `sendMail()` and
  `readMailConfig(input.env)`, retaining explicit single-address validation,
  injected fetch/env, preview prefix, both bodies and 30-second timeout. Its
  `scripts/newsletter-post.ts` extraction should retain the neutral acceptance
  output. Update `lib/kit-email.ts`, `lib/kit-email.test.ts`, README, migration
  docs, and `.claude/skills/kit-email/SKILL.md` provider/config language; keep
  preview sends explicit and separate from Kit broadcasts. No preview dedupe key
  should collapse intentional tests.
- **#436**, stacked on #434: keep its `signupFlow`, `kitDoiFallback`, direct-active
  copy and lease changes in `lib/writing-signup.ts` while retaining this PR's
  `sendMail()` call, stable verification key and neutral error alias. Merge its
  `/api/subscribe` route edit with selected-provider preflight, never restore the
  Postmark-only env check. Retain tests proving both provider selections work
  with its signup modes; reconcile README/docs wording. It inherits #434's
  per-step welcome transport change; do not add a second sending implementation.

## Seven-topic signup and consent

The choices are All Writing, Fiction, Essays, Lab, Queer Columns, Work / AI, and
TH4F. `lib/subscribe-types.ts` defines the accepted values and
`lib/subscription-audiences.ts` maps them to their existing Kit forms and tags.
The four original writing topics use deployment-specific IDs; the other three
use the existing public IDs in that mapping.

1. `/api/subscribe` validates the request and reads the exact Kit address status.
   It performs **no Kit writes**. Suppressed addresses receive no verification
   message and no new memberships.
2. For an eligible address, it stores AES-GCM encrypted email, a keyed email
   digest, and the selected topics in a 24-hour Redis challenge, then sends one
   first-party verification email. A keyed ten-minute cooldown for the same
   address/topic set is retained after an ambiguous provider response.
3. The verification URL carries its signed token in the fragment. The page
   removes the fragment before rendering. Reading the page does not opt in;
   the reader must explicitly press the confirmation button, which submits a
   POST. Cancellation is available only before confirmation processing begins.
4. Confirmation rechecks the Kit address and status. It adds only the selected
   form memberships. Active subscribers also receive those selected tags. New
   or inactive subscribers enter the selected double-opt-in forms and may need
   further Kit confirmation before delivery begins. Ciphertext is removed as
   soon as a matching Kit subscriber ID is retained.
5. `/api/kit/reconcile-confirmations`, authenticated with `CRON_SECRET`, processes
   only the Redis-verified pending records and their stored choices. It checks
   Kit status before tagging; it never treats raw form-member listings as
   consent. `vercel.json` schedules it daily at 08:00 UTC. Pending verified
   records have a bounded 30-day retention window, so Kit Free may delay tagging
   until a later daily run.

Repeat signup is **additive**: choosing new topics leaves existing subscriptions
intact. It is not a replacement-preferences screen. A future preference-removal
or replacement flow requires its own explicit consent and acceptance design.

Source reporting remains aggregate. The request's source is transient challenge
context and is removed when confirmation is claimed; the current Kit form
referrer is the fixed `https://www.thearcades.me/subscribe`. It is not durable
per-subscriber attribution. The first-party-confirmed and Kit-active-ready
counters advance atomically with challenge transitions, preventing repeated
claims from double-counting. Neither count proves an inbox delivery. Do not
expand collection or store source on Kit subscriber records as part of this
acceptance work.

Lead-magnet links remain available in the signup response. Confirmation and
unsubscribe token-bearing pages are excluded from analytics. Never put real
addresses, tokens, raw provider responses, or credentials in logs, receipts,
issues, screenshots, or test fixtures.

## Welcome and unsubscribe gate

`WRITING_WELCOME_ENABLED` must remain unset or false unless its activation is
separately reviewed and approved. Signup verification messages do not depend on
this flag.

When enabled, the welcome follows an explicit first-party confirmation and a
matching Kit-active check. A durable keyed-address claim permits at most one
welcome attempt after an uncertain provider outcome. With several selected
Arcades topics, copy priority is All Writing, Fiction, Essays, Lab, then Queer
Columns; all selected memberships/tags remain intact. Work / AI and TH4F alone
do not receive the Arcades writing welcome. Imported contacts and unconfirmed
Kit subscribers must not be welcomed by bulk enumeration.

The welcome includes an RFC 8058 one-click unsubscribe header and an accessible
linked unsubscribe page. GET is inert; the page button and one-click POST update
Kit state. A definite mail-provider rejection can release the welcome claim; a
timeout or ambiguous response retains it for reconciliation. Provider acceptance
is not proof of delivery.

## Required configuration

Configure through the deployment/operator secret store, never committed files:

- `KIT_API_KEY`
- `KIT_FORM_ALL_ID`, `KIT_FORM_FICTION_ID`, `KIT_FORM_ESSAYS_ID`, `KIT_FORM_LAB_ID`
- `KIT_TAG_ALL_WRITING_ID`, `KIT_TAG_FICTION_ID`, `KIT_TAG_ESSAYS_ID`,
  `KIT_TAG_LAB_ID`, and `KIT_TAG_ARCADEPROFILE_ID`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or compatible
  `KV_REST_API_URL` / `KV_REST_API_TOKEN`
- `SIGNUP_LINK_SECRET` and `CRON_SECRET`
- `MAIL_PROVIDER` (unset/blank defaults to `postmark`); for Postmark,
  `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, and optional `POSTMARK_FROM_NAME` / `POSTMARK_TRANSACTIONAL_STREAM`
- For Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_FROM_NAME`
- `NEXT_PUBLIC_SITE_URL` for the intended production host

Signup/confirmation must fail closed when their required configuration is
missing. This document is not permission to create credentials, configure
persistent access, enable the welcome, or perform a live send.

## Manual essay-send workflow

Publishing an essay does **not** automatically email subscribers. The current
workflow is an operator-invoked CLI, restricted to the exact essay-group allowlist
in `lib/newsletter-post.ts`. Future-dated/private content is ineligible.

```bash
# Read-only content/audience summary; no provider calls.
npm run newsletter:post -- --slug <slug>

# One explicitly approved preview recipient, through the selected provider.
npm run newsletter:post -- --slug <slug> --preview-to <approved-test-address>

# Separately approved broadcast; verifies the public production essay URL first.
npm run newsletter:post -- --slug <slug> --send

# Separately approved intentional repeat after a reconciled, completed send.
npm run newsletter:post -- --slug <slug> --send --resend --reason "<approved reason>"
```

A send verifies HTTP 200 for the production essay URL, validates the Kit API key
and audience IDs, and schedules one non-public Kit broadcast targeting **All
Writing OR Essays** with an any-tag filter. Kit owns unsubscribe suppression and
audience deduplication. The account's sender, supported default template, physical
address, and unsubscribe behavior require separate provider/inbox verification.
The CLI does not add topic memberships or automatically send the other topics.

### Local duplicate-send guard and recovery

Receipts live at `data/newsletter-sends/<slug>.kit.json`. They contain attempt IDs,
timestamps, a tag-audience hash/count, broadcast IDs, and an optional resend
reason, never recipient lists. Keep reasons non-personal. Preserve legacy `.json`
and `.service.json` receipts; an interrupted legacy/service send blocks the Kit
path, and recorded prior success requires an intentional resend.

The CLI exclusively creates `<slug>.kit.json.lock` **before reading send history**
and holds it through the provider request and final receipt write. Concurrent
processes sharing that directory cannot both submit. It writes a pending attempt
before contacting Kit, and records scheduled status only after a positive
broadcast ID and a valid send timestamp are returned. A timeout, server error,
missing/invalid receipt, or failed final write leaves the pending attempt intact.
Normal success/error exits remove only the concurrency lock. An abrupt process
or machine termination can leave a stale lock, which never expires automatically.

If blocked by a lock or pending attempt:

1. Stop other send processes for this essay and confirm none are still running.
2. Preserve the local history and inspect the matching broadcast in Kit, using
   the essay, attempt time, audience, and any returned broadcast ID. A timeout
   can follow acceptance; do not infer that no message was scheduled.
3. Reconcile the local record with verified provider evidence. If acceptance is
   confirmed, retain its broadcast ID and schedule; any further send is an
   intentional repeat requiring `--resend --reason`. If no accepted request can
   be ruled in or out, keep the pending guard and do not retry.
4. Remove a stale lock only after the process and provider state are reconciled.
   Do not simply delete pending history to make the command run.

This is **local concurrency protection**, not provider-level idempotency or a
shared durable ledger. Fresh checkouts, separate runners, lost files, or a
restored old directory can have missing history and are not coordinated by this
lock. A missing receipt is not proof that an essay has never been sent. Use one
controlled send workspace, preserve/back up its receipts, and reconcile Kit
before sending from a new/restored workspace. A durable cross-runner ledger is
outside this bounded change; no automatic retry, lock takeover, or recurring
broadcast automation is added.

Kit's [create-broadcast contract](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast)
uses a `send_at` timestamp for scheduling and `public: false` to avoid web
publication. A local scheduled receipt records provider acceptance, not inbox
delivery or readership.

## Acceptance evidence and remaining operational gates

Safe local coverage exercises the actual CLI in isolated processes with every
HTTP call mocked: read-only dry run, explicit preview, unpublished/configuration
failure, normal scheduling, intentional resends, concurrent sends, timeout and
incomplete provider receipts, abrupt interruption, missing/corrupt local history,
and legacy/service guards. Signup, welcome, and unsubscribe suites separately
cover their consent/state transitions. Record the final tested commit and exact
commands in the implementing PR; do not reuse historical test counts as proof
for current code.

Before closing live Kit acceptance, obtain explicit authorization for the test
address/audience and verify the full provider-backed path, including pending and
active states, selected memberships, suppression, preview/inbox receipt, template
unsubscribe behavior, and the authenticated reconciliation job. Verify actual
production configuration separately. Keep welcome activation gated and manual
broadcasts separately approved. No real subscriber write, live send, credential
change, provider migration, deployment, or welcome activation is established by
this source-only acceptance work.

Historical context: the September standalone-service migration plan is retained
in Git history for audit/rollback analysis. Do not revive its deployment or
ActiveCampaign export steps as prerequisites for the current direct path. A code
rollback alone is not an email-state rollback; preserve current suppression,
consent, and send history and reconcile provider state before any rollback send.

## Standalone Markdown broadcasts

`npm run kit:email` and `.claude/skills/kit-email/SKILL.md` extend the essay
workflow without replacing it. They reuse `lib/kit-broadcast.ts`, audience tag IDs
from `lib/subscription-audiences.ts`, and the essay email frame. Both CLIs now use
`lib/postmark-preview.ts` for their single explicitly addressed preview path.

The default standalone mode is offline and renders subject, preview, HTML/text,
links and OR tag targeting. Kit's [stats endpoint](https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-broadcast)
reports delivery counts; no unsaved tag-union estimate is documented. Do not infer
an active unique audience by summing tags or printing subscriber records.

Draft POST explicitly sets `send_at: null`, `public: false`, `published_at: null`.
A GET must verify the draft state, copy and targeting before a non-PII receipt is
marked ready. Send rechecks that exact ID and template, verifies HTTP 200 for
rendered links/images, requires exact-subject confirmation and current-conversation
approval, then updates the existing draft. Kit's [update prose](https://developers.kit.com/api-reference/broadcasts/update-a-broadcast)
currently conflicts with the [create contract](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast)
about `public` while scheduling. This CLI always preserves `public: false` and
requires a matching returned schedule; never publish to the web as a workaround.
Provider behavior on this account remains a separate live acceptance gate.

Standalone receipts use a normalized subject hash, content/audience hashes, Kit
ID/template, timestamps and hashed resend reason under `data/newsletter-sends`.
The exclusive lock is acquired before reading history; a pending record is saved
before POST/PUT, and retained after any uncertain response or failed final save.
The same lock/recovery and single-workspace limitations described above apply.
Changed copy under the same subject requires a new reviewed draft; an intentional
repeat additionally requires `--resend --reason` on draft and send. A changed
subject or other sending tool is outside this local duplicate guard. Reconcile
Kit history before a first launch send or any recovery from missing history.

The dedicated ignored `.env.kit.local` is operator-managed. Paste the V4 key from
Kit Settings → Developer → V4 keys locally; deployment env pulls redact sensitive
values. Never retrieve credentials automatically or echo them. No real provider
calls, configuration changes, delivery, deployment or welcome activation are
established by the mocked implementation tests.

### Read-only Kit reporting

The standalone CLI also offers `--list [--subject <substring>] [--limit <n>]
[--max-pages <n>]`, `--stats <id>` and `--counts [--max-pages <n>]`. These need
no file, perform GETs only and persist nothing. History follows cursor pages and
marks incomplete scans or limited results, so a missing match is not automatically
proof of no send. Status and `send_at` must be distinguished: a schedule/start date
is not inbox delivery; aborted/sending broadcasts can require stats reconciliation.

Counts use subscriber `include_total_count=true&per_page=1&slim=true` for `all`
and `active`, discard any subscriber record, and never enumerate addresses. Tag
pages request `include=subscriber_count`; their counts may overlap and do not
claim an active unique audience. Unknown fields and address-like labels are removed
from output. Stats preserve unavailable metrics as null and report raw provider
rates with tracking flags. No reports authorize writes or bypass pending guards.

Reference contracts: [broadcast list](https://developers.kit.com/api-reference/broadcasts/list-broadcasts),
[subscriber totals](https://developers.kit.com/api-reference/subscribers/list-subscribers),
[tag counts](https://developers.kit.com/api-reference/tags/list-tags).
Routine drafting, history, stats, counts and approved sends do not require the Kit
website. Known website requirements remain initial V4-key creation, account/billing,
and sender/domain authentication. This source-only addition does not verify live
credentials, counts, analytics or provider behavior on the user's account.
