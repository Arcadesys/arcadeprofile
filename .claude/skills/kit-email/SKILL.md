---
name: kit-email
description: Draft and send Kit email broadcasts from Markdown through the free-plan v4 REST API. Use when the user says "/kit-email", "email the list", "draft a Kit broadcast", "send a newsletter about X", or asks to prepare a mailing-list email.
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

Show the user the dry-run subject, preview, rendered HTML/text and targeting first.
Create the private Kit draft when requested, then show its ID and edit link before
asking for broadcast or preview approval. If anything changes after approval,
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
approved, that same local file/environment needs `POSTMARK_SERVER_TOKEN` and
`POSTMARK_FROM_EMAIL`; optional name/stream use the existing preview settings.
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
counts or enumerate subscriber addresses. Check the current count in Kit when
reviewing the draft, and label any unavailable count honestly.

The launch document contains open audience/history decisions. Its proposed OR
rule is not consent to send. Confirm the Fiction tag and intended offer/audience,
and reconcile Kit history, including drafts, before creating a launch draft.
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
essay broadcasts do. Review the actual Kit template/footer/unsubscribe handling;
local rendering does not prove inbox delivery or the final provider template.

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

Uses only `lib/postmark-preview.ts`, the existing explicitly addressed Postmark
path, with `[Preview]` subject and transactional stream. Multiple recipients and
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
workspace and check Kit history before any launch or recovery send.

## Don't

- Don't send, preview, schedule, deploy, or change env vars implicitly.
- Don't print API keys, subscriber addresses, private notes or raw provider errors.
- Don't treat Kit draft creation, scheduling acceptance or test success as delivery.
- Don't commit, push or publish unless the user asks.

## Tools

- Bash `npm run kit:email` (`scripts/kit-email.ts`) — dry run, private Kit draft,
  approved scheduling, or approved single-address Postmark preview.
