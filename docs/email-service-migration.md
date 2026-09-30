# Email architecture and acceptance record

## Current source contract (updated 2026-09-30)

The active signup and essay-broadcast paths call Kit, Postmark, and Redis
**directly**. They do not depend on deploying `services/email` or setting
`EMAIL_SERVICE_URL`. The earlier standalone-service cutover plan in this document
is superseded. This record describes source behavior; it does not establish that
production credentials, sender authentication, inbox delivery, or provider
configuration have been verified.

- **Kit** owns subscriber status, topic form memberships/tags, double opt-in, and
  essay broadcasts. Cancelled, bounced, and complained addresses are not
  reactivated by the signup flow.
- **Postmark** sends explicitly addressed signup verification messages and CLI
  previews. It also implements the separately gated writing welcome.
- **Upstash Redis** (or the Vercel-injected compatible connection) owns short-lived
  signup challenges, cooldowns/claim leases, durable welcome deduplication, and
  aggregate confirmation counts.
- `lib/email-service.ts` and `services/email` remain historical code. In
  particular, `npm run postmark:test` and `npm run email:test` still invoke that
  legacy service through `scripts/send-test-email.ts`; they do **not** test the
  current direct Postmark preview or signup path. Use the explicitly addressed
  newsletter preview below for that CLI path.

Primary implementation: `app/(frontend)/api/subscribe/route.ts`,
`app/(frontend)/api/subscribe/verify/route.ts`, `lib/writing-signup.ts`,
`lib/kit-confirmation-reconciliation.ts`, `lib/writing-welcome-email.ts`,
`scripts/newsletter-post.ts`, and `lib/kit-broadcast.ts`.

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
   Postmark verification email. A keyed ten-minute cooldown for the same
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
Kit state. A definite Postmark rejection can release the welcome claim; a
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
- `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, and, if configured,
  `POSTMARK_FROM_NAME` / `POSTMARK_TRANSACTIONAL_STREAM`
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

# One explicitly approved preview recipient, through Postmark.
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
