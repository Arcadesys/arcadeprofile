---
name: kit-email
description: Draft, send and report on Kit email broadcasts through the free-plan v4 REST API. Use when the user says "/kit-email", "email the list", "draft a Kit broadcast", "send a newsletter about X", "was X already sent?", "show broadcast stats", "how many subscribers", or asks to prepare a mailing-list email.
---

# kit-email

Prepares a standalone newsletter with `npm run kit:email`. Uses the same Kit API
helper, OR tag filter, and email frame as essay broadcasts. Kit MCP is unavailable
on this free plan; use the script, never substitute another delivery service.

## Approval boundary

**Never run `--send` or `--preview-to` unless the user explicitly approves THAT
send in the current conversation.** A request to draft, publish a post, create a
Kit draft, or send a previous email is not approval for this send. Preview approval
must name one exact address; broadcast approval must cover the reviewed subject,
body, audience and time. A typed CLI confirmation is a guard, not user approval.

For a new email, show the user the dry-run subject, preview, rendered HTML/text
and targeting first. Create the private Kit draft when requested, then show its
verified fields, template ID, broadcast ID and optional edit link before asking
for broadcast or preview approval. The link is a convenience, not a required
website visit; API readback and dry-run output support approval in conversation.
If anything changes after approval,
show the new output and draft for review and obtain approval for the changed send.
Do not send or preview as a way to test this skill.

## Inputs

A Markdown file, absolute or relative to the repository root. New drafts use:

```markdown
---
subject: A subject approved by the user
preview: Short inbox preview text
audience: [all, essays]
---
Body Markdown, including [descriptive links](https://www.thearcades.me/).
```

Also accepts approval documents with exactly one `## Subject`, `## Preview text`,
and `## Body` section. Body ends at the next level-two heading; status, evidence
and targeting notes are not mailed. These files need explicit `--audience` keys.
Never infer consent from prose notes. Preserve the user's copy; do not invent
missing subject, preview, body or audience. Ask for the missing decision.

Audience keys: `all`, `fiction`, `essays`, `lab`, `queer-columns`, `work-ai`, `th4f`.
`all` means **All Writing**, not all Kit subscribers. Each key maps through
`lib/subscription-audiences.ts` to its existing Kit tag. Multiple keys form an OR
filter; Kit deduplicates active subscribers and suppresses unsubscribed contacts.
There is no fallback to all subscribers. Missing IDs block writes. If both file
and command specify audience, they must agree. Do not add or change memberships.

## Local configuration

The CLI reads the ignored, untracked **`.env.kit.local`** in the repository root.
The operator must paste `KIT_API_KEY` from **Kit → Settings → Developer → V4
keys** into that file themselves. `vercel env pull` returns redacted values for
sensitive variables; it cannot supply this key. Never hunt for credentials, print
the file/key, commit it, pull deployment env, or change remote configuration.
Do not ask the user to paste a key into chat.

The four writing audiences use `KIT_TAG_ALL_WRITING_ID`, `KIT_TAG_FICTION_ID`,
`KIT_TAG_ESSAYS_ID`, and `KIT_TAG_LAB_ID`. Only selected keys need their configured
IDs in that local file or operator environment. The other keys retain the public
IDs in `lib/subscription-audiences.ts`. Never guess IDs. If preview is separately
approved, that same local file/environment must provide the existing selected
mail provider configuration via `readMailConfig()`. With Resend selected, that is
`MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and optional
`RESEND_FROM_NAME`. Do not change selection or retrieve credentials as a side effect.
Dry run works without any credentials or IDs.

## Dry run first

```bash
npm run kit:email -- --file /absolute/path/email.md

# Existing launch approval document; keys here are proposed targeting for review.
npm run kit:email -- --file /Users/arcades/.ao/data/artifacts/arcades-websites-4/launch-email-draft.md --audience all,essays,fiction
```

Default mode has **no network calls or writes**. It prints subject, preview, HTML,
plain text, links, OR targeting, configured IDs or missing config names, and an
unavailable recipient count. Kit's documented stats endpoint reports delivery
counts, not a deduplicated estimate for an unsaved tag-union draft. Never sum tag
counts or enumerate subscriber addresses. Use `--counts` for current account/tag
counts, but label the deduplicated OR estimate unavailable; tag totals are not that estimate.

The launch document contains open audience/history decisions. Its proposed OR
rule is not consent to send. Confirm the Fiction tag and intended offer/audience,
and reconcile API history using `--list --subject "This is what I do for fun"`,
including drafts, before creating a launch draft. Increase `--max-pages` if history
is incomplete. Use `--stats <id>` for a possible prior send.
Do not copy its private delivery URL or evidence notes into a public PR.

## Create and review the Kit draft

```bash
npm run kit:email -- --file /absolute/path/email.md --draft
```

POST sets `send_at: null`, `public: false`, and `published_at: null`. GET readback
must verify a private unscheduled draft, matching subject, preview, HTML and OR
targeting. The script prints the ID and `https://app.kit.com/broadcasts/<id>/edit`.
It reuses an identical locally verified draft on a repeated `--draft` invocation.

The body uses the existing essay frame, with large dark text on white, underlined
links, and responsive images. Kit uses the account default template, as existing
essay broadcasts do. The draft readback records its actual template ID and verifies its HTML/targeting.
Show that ID and dry-run rendering in conversation. Local rendering does not
prove inbox delivery or the provider-added footer/unsubscribe handling; an explicitly
approved single-address preview is the delivery check. Do not require a website visit
for routine approval. Template design changes are outside this command's scope.

## Separately approved broadcast

Only after current-conversation approval of the reviewed email:

```bash
npm run kit:email -- --file /absolute/path/email.md --send --broadcast-id <draft-id> --confirm "<exact subject>"
# Optional future ISO time, with timezone:
# ... --send-at 2026-12-01T16:00:00Z
```

Retain `--audience` for section-based input on every invocation. Send requires the
matching locally recorded draft ID, exact subject, unchanged provider draft and
template, and HTTP 200 for every rendered body link/image (following redirects).
Use absolute HTTP(S) destinations; other schemes cannot satisfy the HTTP check.
No explicit time means schedule one minute ahead. There are no automatic retries.
The script updates that draft; it does not create another broadcast to send.

`public` stays false even while scheduling. Kit's update endpoint prose currently
conflicts with its create contract about this flag. Never work around a rejection
by setting `public: true`; stop and reconcile. Only a matching provider schedule
receipt establishes acceptance, not delivery.

## Separately approved preview

After showing the dry run and Kit draft link, obtain approval for the exact single
address, then run:

```bash
npm run kit:email -- --file /absolute/path/email.md --preview-to <approved-address>
```

Uses the extracted `sendPreview()` helper and `lib/mail-transport.ts` with the
selected provider, `[Preview]` subject, both bodies, transactional stream, and
30-second timeout. Each approved preview is intentional: no deduplication key
collapses repeated tests. No automatic retries or provider fallback. Multiple recipients and
combined preview/draft/send modes are rejected. Never use Kit subscriber/tag APIs
to send previews. Do not print the recipient or provider response. Do not retry an
uncertain preview; reconcile it first.

## Receipts and recovery

Non-PII receipts live in `data/newsletter-sends/email-<subject-hash>.kit.json`.
They retain attempt IDs, state, content/audience hashes, tag count, Kit ID/template,
time, and a digest of any resend reason. No addresses, content, secrets or raw
provider bodies are stored. `--draft` can write a receipt; dry run and preview do not.

A per-subject exclusive lock covers history inspection and writes. Pending draft
or send requests block retries, including `--resend`. A timeout can follow Kit
acceptance. Preserve receipts; reconcile Kit and the local process before manually
repairing a pending record or stale lock. Never delete history to bypass a guard.

After a verified prior send, an intentional repeat needs a **new reviewed draft**
and separately approved send, both with `--resend --reason "<non-personal reason>"`.
The already scheduled ID cannot be scheduled again. Resend cannot bypass pending
or corrupt history. This is local protection: changed subjects, missing receipts,
manual sends and separate checkouts are not a shared ledger. Use one controlled
workspace and check API history (`--list`, `--stats`) before any launch or recovery send.
A failed or incomplete read is not proof of absence. If the reports cannot resolve an
ambiguous attempt, keep the guard, explain the uncertainty and request the missing
evidence/API operation; never delete history or require a website visit by default.

## Read-only history, stats and counts

These modes need `KIT_API_KEY` but **no Markdown file, send approval or Kit website
visit**. They make GET requests only and create no receipts, locks or files. Never
combine them with file/draft/send/preview options. Do not run live calls during
implementation/tests; use mocked fetch.

```bash
# Recent broadcasts, newest created first; 25 displayed by default.
npm run kit:email -- --list

# Answer "was X already sent?" across pages, including drafts and scheduled items.
npm run kit:email -- --list --subject "This is what I do for fun" --limit 100 --max-pages 100

# One broadcast: recipients, open/click rate, unsubscribes and tracking flags.
npm run kit:email -- --stats 12345

# Account all/active subscriber totals and per-tag counts/IDs/names; no addresses.
npm run kit:email -- --counts
```

`--list` uses slim broadcast pages (100/page), follows cursors, deduplicates IDs,
and returns only ID, subject, status, created date and `sendAt`. `--subject` is a
case-insensitive substring search. `--limit` is 1–1000 (default 25); `--max-pages`
is 1–100 (default 20), also available for counts. `historyComplete: false` or
`resultsLimited: true` means there may be older/additional matches. Do not claim
"never sent" from incomplete history or a query whose subject may have changed.
`completed` is provider completion; `scheduled` and `draft` are not a send.
`sending` or `aborted` may have partial delivery: inspect stats before deciding.
`sendAt` is Kit's schedule/start timestamp, not inbox delivery evidence.

`--stats` returns raw Kit rates without assuming fraction/percentage units. Null
means unavailable, not zero. Surface disabled tracking and privacy limitations;
opens/clicks do not establish human readership. Old/missing stats or API errors
must be reported as unavailable, never as zero or a successful empty lookup.

`--counts` requests `include_total_count=true` for all and active subscribers,
with `per_page=1&slim=true`; Kit can return one subscriber record, which is
immediately discarded. Never page through it, print it, log it or persist it.
Tags use `include=subscriber_count` and cursor pagination. Tag count status scope
is not specified by that field; do not call it an active audience or sum overlapping
tags. `tagsComplete: false` marks a partial tag inventory. Missing counts remain
null. Names/subjects with address-like text are redacted; unknown provider fields
and raw errors are never printed. No subscriber data is returned by these modes.

For routine drafting, send-history checks, reporting and approved sends, stay in
conversation and use the API. As far as the currently documented API supports,
the tasks still requiring Kit's website are:

- Creating the initial V4 API key (operator action; never paste it in chat).
- Account and billing management.
- Sender/domain authentication and its account/DNS setup.

Do not send the user to Kit's website for history, stats or counts. Keep the edit
link available as an optional convenience. If a future task hits a genuine API gap,
state the specific gap instead of assuming the website is required for ordinary work.

## Don't

- Don't send, preview, schedule, deploy, or change env vars implicitly.
- Don't print API keys, subscriber addresses, private notes or raw provider errors.
- Don't treat Kit draft creation, scheduling acceptance or test success as delivery.
- Don't commit, push or publish unless the user asks.

## Tools

- Bash `npm run kit:email` (`scripts/kit-email.ts`) — dry run, private Kit draft,
  approved scheduling, approved single-address selected-provider preview, or read-only
  history/stats/counts.
