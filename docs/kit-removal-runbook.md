# Kit to Resend cutover runbook

**Do not merge the Kit-removal PR until the import is complete and its counts are verified.** Run this procedure yourself from your main `arcadeprofile` checkout. The migration scripts are not called by the application, build, or deployment.

The snapshot contains subscriber addresses and state. Keep it outside all repositories, restrict access, and delete it after the cutover retention period you choose. Never attach it to a ticket, PR, chat, or report.

## Prepare Resend

1. Create a **Full access** Resend key for Contacts, Topics, Suppressions, and Broadcasts. Store it in an untracked `.env.resend.local` file in the repository root as `RESEND_CONTACTS_API_KEY=...`. This key is required for the import, signup contact reads/writes, unsubscribe, welcome contact lookups, and Broadcasts.
2. Keep production `RESEND_API_KEY` as the existing domain-restricted **Sending access** key for `mail.thearcades.me`, used by the merged mail transport for transactional verification and welcome messages. Do not rename or replace it; it cannot manage contacts or broadcasts.
3. Keep `.env.kit.local` in the repository root, untracked, with `KIT_API_KEY=...`. This is used only by the owner-run export and final unsubscribe synchronization. Never add either key file to Git.
4. Create a saved segment named `All Subscribed Contacts` in the same Resend team. Put its ID in `.env.resend.local` as `RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID`; the import and runtime add confirmed subscribed contacts and remove globally unsubscribed contacts. Add the same ID to Vercel before deployment. Broadcasts also pass the Essays topic ID so Resend honors individual topic preferences.

## Export and import

Run from the owner's repository root on `main`:

```sh
npm run kit:export -- /private/tmp/kit-export-initial.json
npm run resend:topics
npm run resend:import -- --snapshot /private/tmp/kit-export-initial.json
npm run resend:import -- --snapshot /private/tmp/kit-export-initial.json --apply
```

`kit:export` uses Kit v4 GET requests only. It writes a mode-600 snapshot outside the repository, including subscriber email/state, tags mapped to topics, `created_at`, and broadcast subject/status/send date/recipient counts. It prints counts only. The export covers active (89), inactive (1), cancelled/unsubscribed (7), bounced (7), complained (0), and the past 20 broadcasts. Reconcile the fresh export against these read-only counts before applying.

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

The import defaults to a dry run and reports planned counts by state/topic only. `--apply` adds active contacts as subscribed with their topic subscriptions and adds every active contact to the broad subscribed segment; All Writing tags also opt into Fiction and Essays topics. It imports cancelled, bounced, and complained as globally unsubscribed and removes them from the segment; it skips inactive. It is idempotent and rate-limit aware. Progress is checkpointed without storing email addresses so an interrupted run can resume. Do not proceed if planned counts or resulting totals differ from the export.

Immediately before cutover, rerun Kit export and sync unsubscribes from the fresh snapshot:

```sh
npm run kit:export -- /private/tmp/kit-export-cutover.json
npm run resend:import -- --snapshot /private/tmp/kit-export-cutover.json --sync-unsubscribes
```

This mode reads current Kit status, updates Resend global suppression for addresses now cancelled, bounced, or complained, and removes those contacts from the broad subscribed segment. It never clears a Resend suppression.

## Deploy and verify

1. Verify Resend contact and topic totals, including suppressed contacts, against the export summary. Check the All Subscribed Contacts segment: all active imported contacts should be members and globally unsubscribed contacts should not. The signup flow and import keep broad membership current on confirmation and global unsubscribe. Confirm broadcast drafts contain both `segment_id` and the Essays `topic_id`; Resend's [Node SDK type](https://github.com/resend/resend-node/blob/main/src/broadcasts/interfaces/create-broadcast-options.interface.ts) exposes `topicId` and maps it to `topic_id` in the [OpenAPI schema](https://github.com/resend/resend-openapi/blob/main/resend.yaml). Topic-scoped delivery respects preference opt-outs. Confirm the transactional sender is `austen@mail.thearcades.me` on the verified `mail.thearcades.me` domain.
2. Add `RESEND_CONTACTS_API_KEY` (Full access), `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, all seven `RESEND_TOPIC_*_ID` values above, and `RESEND_SEGMENT_SUBSCRIBED_BROADCAST_ID` to the correct Vercel environments. Preserve the existing domain-restricted Sending key in `RESEND_API_KEY` unchanged. Also configure the existing Redis, signing, cron, and site URL variables listed in `docs/email-service-migration.md`. Remove old Kit variables only after source deployment has completed and final sync is finished.
3. Merge the PR only after import and count verification. Deploy through the normal release process.
4. Using your own address, test signup through the first-party verification email and explicit Confirm button. Confirm exactly one verification email arrives and selected Topics are set. Test the site's fallback unsubscribe page and one-click POST; verify the Resend contact becomes globally unsubscribed. These are live actions and must be done by the owner.
5. Run the final `--sync-unsubscribes` once more. Then close the Kit account and revoke its API key. Delete `.env.kit.local`, the private export snapshot, and all `KIT_*` Vercel variables. Keep `.env.resend.local` untracked or remove it when no longer needed.

Resend documents [Contacts](https://resend.com/docs/api-reference/contacts/create-contact), [Topics](https://resend.com/docs/api-reference/topics/create-topic), [Contact Topic preferences](https://resend.com/docs/api-reference/contacts/update-contact-topics), [Broadcast segment and topic targeting](https://resend.com/docs/api-reference/broadcasts/create-broadcast), [Node SDK `topicId`](https://github.com/resend/resend-node/blob/main/src/broadcasts/interfaces/create-broadcast-options.interface.ts), [OpenAPI `topic_id`](https://github.com/resend/resend-openapi/blob/main/resend.yaml), [add a contact to a segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment), [remove a contact from segment](https://resend.com/docs/api-reference/contacts/delete-contact-segment), [Broadcast scheduling](https://resend.com/docs/api-reference/broadcasts/send-broadcast), [API key permissions](https://resend.com/changelog/new-api-key-permissions), [rate limits](https://resend.com/docs/api-reference/rate-limit), [pricing](https://resend.com/pricing), and [global Contacts/Segments](https://resend.com/blog/new-contacts-experience).

`hack.thearcades.me` (TH4F) remains out of scope. `work.thearcades.me` has its own migration worker.
