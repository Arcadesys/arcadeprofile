# Kit to Resend cutover runbook

**The initial Resend import is complete. Do not merge the Kit-removal PR until the default-topic backfill and final unsubscribe sync below are complete and verified.** Run owner-only migration commands yourself from your main `arcadeprofile` checkout. The migration scripts are not called by the application, build, or deployment.

The snapshot contains subscriber addresses and state. Keep it outside all repositories, restrict access, and delete it after the cutover retention period you choose. Never attach it to a ticket, PR, chat, or report.

## Prepare Resend

1. Create a **Full access** Resend key for Contacts, Topics, Suppressions, and Broadcasts. Store it in an untracked `.env.resend.local` file in the repository root as `RESEND_CONTACTS_API_KEY=...`. This key is required for the import, signup contact reads/writes, unsubscribe, welcome contact lookups, and Broadcasts.
2. Keep production `RESEND_API_KEY` as the existing domain-restricted **Sending access** key for `mail.thearcades.me`, used by the merged mail transport for transactional verification and welcome messages. Do not rename or replace it; it cannot manage contacts or broadcasts.
3. Keep `.env.kit.local` in the repository root, untracked, with `KIT_API_KEY=...`. This is used only by the owner-run export and final unsubscribe synchronization. Never add either key file to Git.
4. Create a saved segment named `All Subscribed Contacts` in the same Resend team. Put its ID in `.env.resend.local` as `RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID`; the import and runtime add confirmed subscribed contacts and remove globally unsubscribed contacts. Add the same ID to Vercel before deployment. Broadcasts also pass the Essays topic ID so Resend honors individual topic preferences.

## Export and import

The owner has already completed the initial import. The latest read-only count supplied by the owner is 103 Resend contacts: 89 subscribed, 14 unsubscribed, no duplicates; the inactive Kit contact was skipped. All seven Topics have `default_subscription=opt_out`. Existing Kit-tag topic opt-ins currently match: Lab 2, Essays 2, Fiction 2, Work / AI 2, TH4F 2, All Writing 1, Queer Columns 1. Roughly 85 of the active imported contacts had no Kit topic tags. The approved default for those contacts is All Writing, Fiction, and Essays only.

The snapshot remains necessary to select exactly the Kit-active, untagged rows. If the original snapshot is unavailable, export it again before running the backfill. Run from the owner's repository root on `main`:

```sh
npm run kit:export -- /private/tmp/kit-export-cutover.json
npm run resend:import -- --snapshot /private/tmp/kit-export-cutover.json --backfill-default-topics
```

The backfill command is a dry run unless `--apply` is added. It prints aggregate counts only. The dry run reports active rows, untagged candidates, and the three approved Topics. Then apply it:

```sh
npm run resend:import -- --snapshot /private/tmp/kit-export-cutover.json --backfill-default-topics --apply
```

Apply adds the 3 approved opt-ins only to active contacts with no Kit topic tags. It does not create contacts, clear a global unsubscribe, or write topic preferences for contacts with Kit tags. For every active Kit contact it also repairs membership in `All Subscribed Contacts`, which is used by topic-scoped broadcasts. Repeating the operation is safe. A suppression, missing contact, or Resend contact marked unsubscribed is skipped. It prints counts only.

`kit:export` uses Kit v4 GET requests only. Subscriber requests explicitly set `status=all` and `include=tags`; Kit otherwise returns active contacts only. It writes a mode-600 version-2 snapshot outside the repository, including subscriber email/state, tags mapped to topics, `created_at`, and broadcast subject/status/send date/recipient counts. It prints aggregate counts only. The export covers active (89), inactive (1), cancelled/unsubscribed (7), bounced (7), complained (0), and the past 20 broadcasts. Reconcile the fresh export against these read-only counts before applying.

The exporter maps Kit's returned tag IDs (All Writing `23851250`, Fiction `23851251`, Essays `23851252`, Lab `23851253`, Queer Columns `23866437`, Work / AI `23806915`, TH4F `23808390`) to topics; it does not depend on `KIT_TAG_*` environment variables. If an active subscriber has a tag the exporter cannot classify, export stops without writing a snapshot. The export records aggregate total and active tagged-subscriber counts. The backfill refuses snapshots without tag inclusion, with zero tagged active subscribers, or with aggregate tag counts inconsistent with the rows. This prevents an active-only or tag-empty snapshot from turning tagged readers into default-topic candidates.

`resend:topics` creates any missing opt-out Topics in that same shared Resend team, including both `Work / AI` and `TH4F`, and saves their IDs to the untracked mode-600 `.env.resend.topics`. Topic names and deployment variable names are fixed as follows:

If a same-named topic already exists with a default other than `opt_out`, the command stops without changing it. Correct that topic's default in Resend, then rerun `resend:topics`.

| Resend Topic | Environment variable |
| --- | --- |
| All Writing | `RESEND_TOPIC_ALL_WRITING_ID` |
| Fiction | `RESEND_TOPIC_FICTION_ID` |
| Essays | `RESEND_TOPIC_ESSAYS_ID` |
| Lab | `RESEND_TOPIC_LAB_ID` |
| Queer Columns | `RESEND_TOPIC_QUEER_COLUMNS_ID` |
| Work / AI | `RESEND_TOPIC_WORK_AI_ID` |
| TH4F | `RESEND_TOPIC_TH4F_ID` |

Resend Topics belong to the one global Contacts system; don't create separate Audiences for the two sites. Resend now marks Audiences as deprecated ([Contacts experience](https://resend.com/blog/new-contacts-experience)).

The original import maps active untagged Kit rows to All Writing, Fiction, and Essays. Active rows with explicit Kit tags receive those topics; All Writing also expands to Fiction and Essays. Cancelled, bounced, and complained are globally unsubscribed; inactive is skipped. The original import is idempotent and rate-limit aware. Do not re-run the full import during this cutover unless intentionally reconciling the original snapshot.

After the backfill has been applied and its aggregate counts reviewed, perform the final Kit unsubscribe sync from a fresh snapshot:

```sh
npm run kit:export -- /private/tmp/kit-export-cutover.json
npm run resend:import -- --snapshot /private/tmp/kit-export-cutover.json --sync-unsubscribes
```

This mode reads current Kit status using `status=all`, updates Resend global suppression for addresses now cancelled, bounced, or complained, and removes those contacts from the broad subscribed segment. It never clears a Resend suppression. It refuses a snapshot without all-state/tag-coverage metadata or without the known inactive, cancelled, and bounced states; it applies the same state check to the current Kit response. Confirm the final sync count, then compare Resend totals and segment membership to the snapshot before merging.

## Deploy and verify

1. Verify Resend contact and topic totals, including suppressed contacts, against the fresh export. Check the All Subscribed Contacts segment: all 89 active imported contacts should be members and globally unsubscribed contacts should not. Confirm the backfill added All Writing, Fiction, and Essays opt-ins for the untagged cohort while keeping existing tagged topic choices intact. The signup flow and backfill keep broad membership current on confirmation and global unsubscribe. Confirm broadcast drafts contain both `segment_id` and `topic_id`; Resend's [Node SDK type](https://github.com/resend/resend-node/blob/main/src/broadcasts/interfaces/create-broadcast-options.interface.ts) exposes `topicId` and maps it to `topic_id` in the [OpenAPI schema](https://github.com/resend/resend-openapi/blob/main/resend.yaml). Topic-scoped delivery respects preference opt-outs. Confirm the transactional sender is `austen@mail.thearcades.me` on the verified `mail.thearcades.me` domain.
2. Add `RESEND_CONTACTS_API_KEY` (Full access), `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, all seven `RESEND_TOPIC_*_ID` values above, and `RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID` to the correct Vercel environments. Preserve the existing domain-restricted Sending key in `RESEND_API_KEY` unchanged. Also configure the existing Redis, signing, cron, and site URL variables listed in `docs/email-service-migration.md`. Remove old Kit variables only after source deployment has completed and final sync is finished.
3. Merge the PR only after backfill, final unsubscribe sync, and count/segment verification. Deploy through the normal release process.
4. Using your own address, test signup through the first-party verification email and explicit Confirm button. Confirm exactly one verification email arrives and selected Topics are set. Test the site's fallback unsubscribe page and one-click POST; verify the Resend contact becomes globally unsubscribed. These are live actions and must be done by the owner.
5. Run the final `--sync-unsubscribes` once more. Then close the Kit account and revoke its API key. Delete `.env.kit.local`, the private export snapshot, and all `KIT_*` Vercel variables. Keep `.env.resend.local` untracked or remove it when no longer needed.

Resend documents [Contacts](https://resend.com/docs/api-reference/contacts/create-contact), [Topics](https://resend.com/docs/api-reference/topics/create-topic), [Contact Topic preferences](https://resend.com/docs/api-reference/contacts/update-contact-topics), [Broadcast segment and topic targeting](https://resend.com/docs/api-reference/broadcasts/create-broadcast), [Node SDK `topicId`](https://github.com/resend/resend-node/blob/main/src/broadcasts/interfaces/create-broadcast-options.interface.ts), [OpenAPI `topic_id`](https://github.com/resend/resend-openapi/blob/main/resend.yaml), [add a contact to a segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment), [remove a contact from segment](https://resend.com/docs/api-reference/contacts/delete-contact-segment), [Broadcast scheduling](https://resend.com/docs/api-reference/broadcasts/send-broadcast), [API key permissions](https://resend.com/changelog/new-api-key-permissions), [rate limits](https://resend.com/docs/api-reference/rate-limit), [pricing](https://resend.com/pricing), and [global Contacts/Segments](https://resend.com/blog/new-contacts-experience).

`hack.thearcades.me` (TH4F) remains out of scope. `work.thearcades.me` has its own migration worker.
