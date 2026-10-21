# Email and newsletter operations

The first-party signup flow sends one verification email through `lib/mail-transport.ts`. The site writes to Resend Contacts only after the reader presses Confirm. Resend's seven Topics are All Writing, Fiction, Essays, Lab, Queer Columns, Work / AI, and TH4F. Selection changes are additive. An unsubscribe is global for the contact, matching the existing one-click and fallback behavior.

## Provider design

- Resend Contacts stores each address once. The `unsubscribed` field is a global suppression; an existing suppressed contact is never changed back to subscribed. Signup also checks Resend's team suppression list so bounced and complained addresses are not sent verification or resubscribed.
- Resend Topics express the seven preferences. Configure all seven Topics with opt-out defaults. After explicit confirmation, the site updates only selected topic IDs to `opt_in`; it does not opt out unselected topics.
- Resend's Broadcast create API targets a `segmentId`; its current API schema does not expose `topicId` targeting. Configure `RESEND_SEGMENT_ESSAY_BROADCAST_ID` as the saved segment “All Writing OR Essays”. Explicit confirmation adds contacts who opt into All Writing or Essays to that segment; the owner import does the same for migrated active contacts. Global unsubscribe removes the contact from the segment. Topic changes through the site's signup flow are additive, so existing segment membership remains when a later confirmation selects other topics. Broadcast creation is a draft first; the CLI schedules it only when `--send` is present.
- Broadcast content includes `{{{RESEND_UNSUBSCRIBE_URL}}}`. Resend applies the unsubscribe destination and skips unsubscribed contacts.
- Keep the existing `RESEND_API_KEY` as a domain-restricted **Sending access** key for `mail.thearcades.me`, used only for verification and welcome mail. Add `RESEND_CONTACTS_API_KEY` as a **Full access** key for Contacts, Topics, Suppressions, and Broadcasts; the server needs it for signup reads/writes, global unsubscribe, welcome contact lookups, and the newsletter CLI. Sending access is send-only and cannot manage contacts or broadcasts. ([API key permissions](https://resend.com/changelog/new-api-key-permissions)).

Resend's free marketing plan covers 1,000 contacts. The free transactional plan currently provides 3,000 emails/month and 100/day; Broadcasts count against marketing contacts rather than the transactional email quota. Recheck the [current pricing page](https://resend.com/pricing) before cutover. The default API limit is 10 requests/second per team across all keys; respect `retry-after` on 429 responses. Free transactional quotas return `x-resend-daily-quota` and `x-resend-monthly-quota` headers. ([Usage limits](https://resend.com/docs/api-reference/rate-limit))

API references: [create contact](https://resend.com/docs/api-reference/contacts/create-contact), [update contact](https://resend.com/docs/api-reference/contacts/update-contact), [update contact topics](https://resend.com/docs/api-reference/contacts/update-contact-topics), [create broadcast (`segmentId` targeting)](https://resend.com/docs/api-reference/broadcasts/create-broadcast), [add contact to segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment), [remove contact from segment](https://resend.com/docs/api-reference/contacts/delete-contact-segment), [send broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast), [create topic](https://resend.com/docs/api-reference/topics/create-topic), [list topics](https://resend.com/docs/api-reference/topics/list-topics), [topics and unsubscribe preferences](https://resend.com/blog/unsubscribe-topics), [suppressions](https://resend.com/changelog/suppression-list-support), [global Contacts model and Segments](https://resend.com/blog/new-contacts-experience).

## Runtime configuration

Configure through Vercel, not committed files:

- `RESEND_API_KEY` — existing domain-restricted Sending access key for the verified `mail.thearcades.me` domain.
- `RESEND_CONTACTS_API_KEY` — Full access key for Contacts, Topics, Suppressions, and Broadcasts.
- `RESEND_FROM_EMAIL=austen@mail.thearcades.me`, `RESEND_FROM_NAME`; `MAIL_PROVIDER=resend` for transactional verification/welcome mail.
- `RESEND_TOPIC_ALL_WRITING_ID`, `RESEND_TOPIC_FICTION_ID`, `RESEND_TOPIC_ESSAYS_ID`, `RESEND_TOPIC_LAB_ID`, `RESEND_TOPIC_QUEER_COLUMNS_ID`, `RESEND_TOPIC_WORK_AI_ID`, `RESEND_TOPIC_TH4F_ID`.
- `RESEND_SEGMENT_ESSAY_BROADCAST_ID` — segment matching All Writing OR Essays.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV equivalents), `SIGNUP_LINK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
- Keep `WELCOME_SERIES_ENABLED` default off. `WRITING_WELCOME_ENABLED` remains the legacy mutually exclusive gate.

Do not store plaintext email in the welcome queue. It contains a Resend contact ID and keyed digest; the address is fetched at each send and delivery stops when Resend says the contact is unsubscribed. Once-only dedupe, step keys, leases, and uncertain-send holds remain in place. Metrics are aggregate counters only.

## Broadcast CLI

```sh
# Dry run by default
npm run newsletter:post -- --slug <slug>

# Explicit test preview
npm run newsletter:post -- --slug <slug> --preview-to <approved-test-address>

# Create a draft and schedule it after production URL verification
npm run newsletter:post -- --slug <slug> --send

# Intentional repeat after reconciliation
npm run newsletter:post -- --slug <slug> --send --resend --reason "<reason>"
```

Receipts in `data/newsletter-sends` contain only counts, hashes, attempt and broadcast IDs, and timestamps. An ambiguous pending receipt must be reconciled in Resend before retrying. Do not place addresses, provider bodies, or credentials in receipts or logs.

## Migration and cutover

Follow [`kit-removal-runbook.md`](kit-removal-runbook.md). Migration scripts are owner-run from the owner's main checkout. They are not part of deployment or runtime. No export/import runs as part of this source change.

### Operational boundaries

This change does not establish that the contacts were imported, production variables were changed, the site was deployed, or a live signup/unsubscribe passed. The PR must not merge until the owner completes the import and cutover runbook. `hack.thearcades.me` (TH4F) and `work.thearcades.me` have separate Kit use; TH4F is outside this change and work.thearcades.me is handled separately.
