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
  previews. It also implements the separately gated writing welcome and in-house series.
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
`lib/welcome-delivery.ts`, `lib/welcome-series.ts`, `lib/welcome-series-copy.ts`,
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

Production status supplied by the user: Resend is selected and a signup
confirmation arrived from `austen@mail.thearcades.me`. This worker performed no
live send or provider read. The following cutover steps are a historical/operator
reference; do not restore Postmark or repeat configuration changes for the series.

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

### Integration of stacked PRs

- **#434**, based on #433: integrated below. Welcome/series delivery uses the
  shared transport, neutral rejection handling, caller-supplied digest+step
  keys, and both-provider mocked tests. Leases and uncertain states are retained.
- **#435**: replace `lib/postmark-preview.ts`'s request with `sendMail()` and
  `readMailConfig(input.env)`, retaining explicit single-address validation,
  injected fetch/env, preview prefix, both bodies and 30-second timeout. Its
  `scripts/newsletter-post.ts` extraction should retain the neutral acceptance
  output. Update `lib/kit-email.ts`, `lib/kit-email.test.ts`, README, migration
  docs, and `.claude/skills/kit-email/SKILL.md` provider/config language; keep
  preview sends explicit and separate from Kit broadcasts. No preview dedupe key
  should collapse intentional tests.
- **#436**, stacked on #434: signup modes, fallback counters/copy and leases are
  integrated with `sendMail()`, the stable verification key and compatibility
  alias. `/api/subscribe` retains selected-provider preflight and neutral error
  handling. Both provider selections have mocked signup-mode coverage. Welcome
  delivery is inherited from #434 with digest+step keys; no extra sender is added.

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
4. With `KIT_DIRECT_ACTIVE_SIGNUP` unset/false, confirmation rechecks the Kit
   address and status. It adds only the selected
   form memberships. Active subscribers also receive those selected tags. New
   or inactive subscribers enter the selected double-opt-in forms and may need
   further Kit confirmation before delivery begins. Ciphertext is removed as
   soon as a matching Kit subscriber ID is retained.
5. `/api/kit/reconcile-confirmations`, authenticated with `CRON_SECRET`, processes
   only legacy/fallback Redis-verified pending records and their stored choices.
   Direct records are excluded independently of the flag. It checks
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

## Direct active signup: draft, default off

`KIT_DIRECT_ACTIVE_SIGNUP` is enabled only by `true` (case-insensitive, trimmed);
unset, false and other values preserve the existing flow above. This is an
approved consent-flow design, **not approval to activate it**. No live Kit or
mail-provider call, email, environment change, deployment or merge was performed for
this draft.

On the explicit first-party confirmation POST, direct mode rechecks the matching
Kit identity/state, including an exact email lookup for a challenge without a Kit
ID. New subscribers are created via `POST /v4/subscribers` with `state: active`.
Existing active subscribers are reused. Selected tags and the existing Arcades
provenance tag (when applicable) are applied immediately. No form endpoints,
form membership, hosted Kit signup page or Kit DOI email are requested. Existing
memberships are preserved; this is additive only. Cancelled, bounced, complained
and unknown states remain blocked. A matching Kit ID replaces ciphertext before
subsequent form/tag/welcome work. Partial failures retain the signed challenge
for retry. The sole form fallback is an inactive subscriber, as described below.

The first successful claim records `signupFlow: direct-active` alongside the
existing non-address challenge fields. Retries retain that mode even if the flag
is later disabled. Already-processing legacy records retain their old behavior;
legacy `awaiting-kit` records still drain through the daily cron after activation.
Successful new/active direct records never enter that queue; inactive fallback
records enter it exactly as legacy DOI records do. The cron also removes any stale direct
index entries without provider calls. Completed direct signups advance both
`first_party_verified` and `kit_active_ready` via the existing atomic transitions;
replays and retries do not count twice. Failures may leave a legitimate gap
between these counts. They measure transitions, not inbox delivery.

The existing #434 dispatcher receives the same first-party-confirmed + Kit-active
eligibility immediately after tagging and a fresh Kit-active/identity check.
It enrolls only if its **separate** welcome flag permits it. No new enrollment
store or dedupe is added; the existing permanent keyed-address marker prevents
repeat confirmations, later topic additions and cron from double-enrolling.

### API contract and approved inactive fallback

Checked against official docs on 2026-10-20:

- [Create a subscriber](https://developers.kit.com/api-reference/subscribers/create-a-subscriber)
  supports creating a new subscriber as `active` (also the default). An existing
  address is an upsert, but the docs explicitly exclude state updates.
- [Update a subscriber](https://developers.kit.com/api-reference/subscribers/update-a-subscriber)
  accepts email, first name and custom fields; it documents no state parameter.
- [Tag a subscriber](https://developers.kit.com/api-reference/tags/tag-a-subscriber)
  accepts an existing subscriber ID independently of form membership. Thus
  active creation followed by tagging is documented; inactive activation is not.
- [Subscriber status and consent policy](https://help.kit.com/en/articles/2502651-the-subscriber-profile-page-and-status)
  requires explicit consent for reactivation. This flow applies a stricter rule:
  cancelled/bounced/complained contacts are never reactivated by signup.

**Approved narrower behavior:** the original design allowed someone who never
confirmed Kit DOI to become active after first-party confirmation. The current
v4 contract does not document that transition. The coordinator approved retaining
the **unchanged legacy path for inactive contacts**, replacing the original
inactive-to-active acceptance criterion: add only the selected DOI forms, let
Kit send its own confirmation, then apply tags through daily reconciliation
once Kit reports active. No welcome enrolls before that active check.

The confirmation POST pins `signupFlow: legacy-fallback` and a non-PII boolean
`kitDoiFallback` before the form calls. The same atomic challenge transition
increments daily aggregate `kit_doi_fallback` **once per confirmed challenge**,
against its original first-party verification day. Retries/replays do not count
again. It counts fallback selection even if a later form request fails; compare
it with reconciliation errors, not with unique subscriber totals. Flag-off
legacy requests do not increment this new fallback counter.

Pre-confirmation UI describes one first-party email and a next step rather than
promising that every existing contact is ready. The verification email preserves
legacy copy for an address already known inactive. Fallback confirmation success
explicitly explains that Kit may send one more confirmation email. Signup API
responses do not expose subscriber state. No new per-address source, IP or user
agent is collected. A race in which creation returns an existing inactive contact
also takes the same fallback. Unknown/suppressed states are still blocked.

**Open follow-up, not an activation blocker:** ask Kit support whether a supported
v4 inactive-to-active method is possible. No support request or live test is
performed here. Never use an undocumented activation route, fabricate success,
or delete/recreate a subscriber. Mocked upserts preserve existing states.

### Consent evidence and its limits

Opt-in is the explicit signed confirmation **POST**, following the verification
email listing selected topics. The token is cleared from the URL fragment and
GET is inert. Redis records the first-party `verifiedAt`, keyed digest, Kit ID,
selected audiences, flow and later `kitActiveAt` within the existing bounded
challenge lifetime; completed direct records retain the existing TTL rather
than creating a permanent consent ledger. Aggregate counters persist separately
and cannot prove one person's consent. Source is still removed on claim. No IP,
user agent, new email copy, new PII field or raw token log is stored.

Kit returns `created_at` for the subscriber; it establishes record creation, not
the selected-topic consent event, and is older for an existing contact. Kit's
[subscriber analytics](https://help.kit.com/en/articles/14085468-understanding-the-subscriber-analytics-dashboard-in-kit)
distinguishes an API source type, while its [attribution guide](https://help.kit.com/en/articles/9904027-subscriber-attribution-how-subscribers-first-found-you)
says API additions do not get Form/UTM attribution. Neither establishes the
first-party button press or a durable topic-consent record. No custom `source`
field is added to Kit. Account-specific source display is unverified.

**Open decision:** if long-term per-subscriber consent evidence is required,
approve the minimum fields, consent-text version, retention, access and deletion
policy separately. The existing short-lived event plus provider metadata is not
a durable audit trail. No additional evidence store is built in this draft.

### Direct signup activation checklist

1. Obtain explicit user approval to activate this consent change, including the
   approved inactive DOI fallback above. Review the stacked #434 dependency; welcome
   activation remains separately gated.
2. Verify Kit's sender/domain authentication, sending eligibility and suppression
   state. Review any existing tag-triggered automations; direct new/active signup removes form calls, while inactive fallback retains
   them; tags may already trigger account-side actions. Verify the selected mail provider
   verification sender/domain separately. No account check is claimed here.
3. Only after approval, set `KIT_DIRECT_ACTIVE_SIGNUP=true` in the intended Vercel
   environment and redeploy the approved revision. The server passes only the
   public mode boolean to shared signup UI; prerendered copy must be rebuilt with
   the same flag. Keep welcome flags unchanged unless separately approved.
4. Watch confirmation/form/tag errors and retries; daily aggregate
   `first_party_verified`, `kit_active_ready`, `kit_doi_fallback` and the
   verification/active gap; Kit active status and selected tags,
   suppression/complaints and provider delivery. Expect old DOI records to drain
   through cron along with new inactive fallbacks; successful new/active direct
   records need no reconciliation.
   Verify one confirmation/no forms for new/active, plus DOI/reconciliation for
   inactive fallback, only with a separately
   approved test address/send; mocks do not establish provider/inbox behavior.
5. To pause new direct claims, unset/disable the flag and redeploy after approval.
   Processing direct records stay pinned; legacy records keep draining. Disabling
   does not remove tags, undo consent/state changes or replay welcome enrollment.

## Welcome series: default off, in-house delivery

Kit Free remains the list/status/consent authority. No Kit Sequence, paid automation,
new provider, new cron or new credential retrieval is needed for this series.
`lib/welcome-delivery.ts` replaces the single-welcome call at the **same two existing
eligibility points**: the explicit first-party verification POST after Kit-active
recheck, and verified-ledger reconciliation after double opt-in becomes active.
That existing bridge is sufficient; this does not require a new Kit tag bridge.
Only the stored, explicitly selected audiences are used. All Writing, Fiction,
Essays, Lab and Queer Columns qualify; Work / AI or TH4F alone do not. Imported
contacts are not enumerated or backfilled. An imported/existing contact can qualify
only if they personally submit and claim a new signup, under the existing rules.

### Flag interaction

No environment values are changed by this implementation. Both flags default off.

| WELCOME_SERIES_ENABLED | WRITING_WELCOME_ENABLED | Confirmed-signup dispatch / due series |
| --- | --- | --- |
| unset/false | unset/false | No enrollment or welcome sends |
| true | unset/false | Series only; legacy welcome not called |
| unset/false | true | Legacy single welcome only; series paused |
| true | true | Conflict: both dispatch and due series fail closed |

Leave `WRITING_WELCOME_ENABLED` unset/false. The legacy flag's original gate remains
intact. Both paths atomically compete for the **same permanent HMAC address key**,
`writing:welcome:<digest>`. A previous legacy success, in-flight/ambiguous legacy
attempt, or series enrollment blocks the other path, even across flag changes and
repeated signup challenges. Never delete this key to retry a series. The series
returns immediately without Redis/provider requests when its gate is off.
Selected-provider signup verification is independent of both welcome flags.

### Storage, timing and stop behavior

An atomic Redis Lua enrollment writes the shared dedupe marker, the series record
and its due-index entry together. Records contain Kit subscriber ID, selected
audiences, current step, enrollment/next-due/expiry timestamps, status and claim
lease fields. The key contains the HMAC digest. **No address or email ciphertext
is stored in the series.** Before each send the address and status are read from
Kit by subscriber ID, and the address digest must still match. A non-active,
missing, or changed-address subscriber is stopped and their series record/index
entry deleted. No unsubscribe or audience updates are added by the engine.

Records expire 30 days after enrollment, including stalled/ambiguous records;
updates preserve that original deadline. The HMAC-only once-per-address marker
stays durable, as in the legacy welcome. Completed/stopped records are deleted
immediately. Stale index members without a live record are removed by the cron.

Email 1 is attempted at enrollment. Emails 2 and 3 become due at enrollment +3 and
+7 days. The existing authenticated `/api/kit/reconcile-confirmations` cron also
runs the due queue at `0 8 * * *`; `vercel.json` is unchanged. On Hobby, daily
cron timing has hour-level precision, so expect the first daily invocation after
a step becomes due, rather than an exact delivery hour. A run processes at most
50 due records and at most one step per selected record. Backlogs, outages,
provider errors and function time limits can delay delivery; monitor aggregate
`series.checked/sent/stopped/uncertain/deferred/failed` counts and queue age.
Fifty cron steps/day is a cap, not proven production throughput. Two delayed
steps per enrolled subscriber imply roughly 750 new subscribers/month at that
cap in steady state, before retries and runtime limits. Review capacity before
using larger volume estimates as an operating promise.

[Vercel's current limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
allow daily Hobby crons (currently up to 100 jobs/project); this implementation
reuses the existing job. It adds no schedule or plan dependency.

### Leases and ambiguous-send recovery

Each step is claimed by an atomic compare-and-set with a two-minute lease.
Pre-send leases can be reclaimed after expiry; stale workers cannot transition
someone else's claim. After re-reading Kit, a **durable sending state is stored
before the mail transport is called**. Success advances exactly that step atomically, with
its next-due index update. The third success deletes the series record.

A timeout, 5xx, incomplete/malformed receipt, or crash/lost commit after a possible
provider acceptance holds that exact step as sending/uncertain. It is never
automatically resent or advanced. An expired sending lease becomes uncertain,
not sendable. Uncertain records are removed from the due index, retain their
30-day expiry and keep the permanent address marker. A definite rejection can
retry after one day, within original retention. Kit read errors defer without
sending. Provider acceptance is not proof of inbox delivery.

Before repairing a held step, independently reconcile the attempt with the selected provider.
Only proof of non-acceptance permits a controlled CAS reset of that exact step;
confirmed acceptance permits a controlled advance/reindex. Unknown means hold.
No automated maintenance/reset tool or blind retry is included. Do not remove
shared dedupe keys, reset a whole cohort, or log addresses/tokens/provider bodies.

Delivery delegates to `lib/mail-transport.ts`: `writingWelcomeSenderConfig()`
reads only the selected provider through `readMailConfig()`, and
`sendWelcomeContent()` calls `sendMail()` with both bodies, disabled tracking,
and the existing RFC 8058 one-click headers and linked fallback page. Resend
tracking is a domain setting and must remain disabled before activation. No
welcome or series code calls a provider endpoint directly.

Each series message uses the caller-supplied stable key
`welcome-series/<HMAC digest>/step-<0|1|2>`. Different steps cannot collide even
if overdue messages run within the same provider idempotency window; retries
retain their own step's key. The single welcome retains
`writing-welcome/<HMAC digest>`. No plaintext address is included.
`MailRejectedError` follows the existing definite-refusal transition; unknown
receipts, unfamiliar errors, Resend idempotency conflicts and timeouts hold the durable uncertain
state. Redis leases, retention and permanent dedupe remain authoritative.

### Activation checklist — requires separate user approval

All items below are future approval gates, not authorization to send now:

1. Read/approve all three emails and the Broomsticks PDF/EPUB from parent draft
   PR #433; verify real gift URLs after a separately authorized deployment.
2. Verify approved sender/domain authentication (DKIM/SPF/DMARC), reply handling,
   required sender/footer details and appropriate selected-provider message classification and tracking settings.
   Resolve any necessary stream configuration separately; no env values change here.
3. Confirm the actual selected-provider plan, monthly allowance, other sender traffic,
   daily queue/runtime capacity, Redis retention and unsubscribe behavior.
4. Review shared legacy dedupe markers; do not backfill/import subscribers or
   reset prior welcome claims. Ensure any proposed Kit sequence stays inactive.
5. Obtain explicit, separate approval for **one live preview to the user's own
   inbox only**. Confirm the exact recipient and send scope in that task. Do not
   enable the global series just to preview it, and do not send previews/tests
   to real addresses as part of this draft work. Until then use rendered local
   HTML and mocked-provider tests only.
6. Only after the user approves activation and the actual deployment: enable
   `WELCOME_SERIES_ENABLED=true` through the approved operator workflow, while
   leaving `WRITING_WELCOME_ENABLED` unset/false. This checklist does not perform
   that change. Verify aggregate enrollment/step results without logging PII.
7. Rollback: disable the series flag to stop enrollment and sends. Queued records
   remain until their original TTL; resuming can process overdue pending steps.
   Uncertain steps stay held. Never enable both flags or delete dedupe to recover.

### Monthly selected-provider volume

For N newly enrolled subscribers completing the series, one verification each,
P explicitly approved preview recipient-sends, and O other mail, the steady-state
estimate is **4N + P + O**. Add abandoned/repeated/non-series verification attempts,
known-rejection retries and cohort carryover. Kit DOI and Kit broadcasts are
separate and do not count toward the selected sending provider.

Examples with four preview recipient-sends: N=20 gives 84/month; N=25 gives
104/month; N=100 gives 404/month. Budget against the actual Resend account's
daily and monthly quota and other traffic, using the provider contract above.
The old Postmark-only pricing estimate is superseded; do not configure or switch
back to Postmark for this series. No account settings or plans change in this PR.

The existing daily cron processes at most 50 due records. At two delayed steps
per completed journey, roughly 750 new journeys/month is an arithmetic ceiling
before retries/runtime limits, not measured production capacity. Kit stays on
its list/status API; paid Kit sequences are not required.

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
- `WELCOME_SERIES_ENABLED` and `WRITING_WELCOME_ENABLED` remain unset/false;
  see the separate series activation checklist above

Retain Kit form IDs for inactive fallbacks and flag-off rollback; direct
new/active signup needs only the audience tags. `KIT_DIRECT_ACTIVE_SIGNUP` stays
unset/false until separately approved.

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
