# Email service migration and implementation record

## Review outcome

The site now calls a stable service API. The independently runnable service owns
portable subscription and suppression records, prepares Kit newsletter audiences,
and retains Postmark for transactional delivery. This is a build for review;
no production cutover, remote contact migration, cancellation, or broadcast was
performed. Do not deploy the site changes before the service is ready.

Current source has no Payload account/password-email system. The remaining
transactional callers are preview and explicit test messages. The generic service
transactional endpoint preserves a path for future account messages. Kit's public
V4 API documents broadcasts and sequences, not a general arbitrary-recipient
transactional endpoint; this build does not claim a complete Postmark replacement.

Legacy ActiveCampaign/Postmark helpers and fixtures remain for historical receipt
reconciliation and rollback. Active site callers and publishing scripts use the
new boundary. No marketing automation trees, lead-magnet email sequences, or
external forms were migrated. Existing inline download responses are preserved.

## Official contracts checked 2026-09-10

- [Kit subscriber upsert](https://developers.kit.com/api-reference/subscribers/create-a-subscriber): existing copies retain their state.
- [Kit broadcasts](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast): explicit tag targeting; `send_at` schedules delivery; `public: false` avoids web publication. Starting-point templates are unsupported.
- [Modern events](https://developers.kit.com/webhooks/event-types), [signature contract](https://developers.kit.com/webhooks/verifying-signatures), and [batch envelope](https://developers.kit.com/webhooks/delivery-format).
- [Webhook plan gating](https://developers.kit.com/webhooks/errors) and [paid-plan requirement](https://help.kit.com/en/articles/16639499-create-and-manage-webhooks-in-kit). General API access alone is insufficient. No account eligibility was verified.
- [Kit template requirements](https://help.kit.com/en/articles/2810363-creating-a-custom-html-email-template): verify the account's default supported template includes content, working unsubscribe link, and physical address before sending. This adapter uses that account default.
- [Postmark webhook protection](https://postmarkapp.com/developer/webhooks/webhooks-overview): Basic auth, payload validation, and retry handling.

## Cutover sequence — requires a separate authorized operational run

1. Select an existing controlled host with durable storage and HTTPS. Deploy the
   service with sends disabled. Configure independent subscription/admin keys.
   Give the website only `EMAIL_SERVICE_URL` and `EMAIL_SERVICE_SUBSCRIBE_KEY`;
   the operator newsletter environment additionally needs `EMAIL_SERVICE_ADMIN_KEY`.
2. Verify paid Kit webhook access, sender/domain authentication, the account's
   default template and unsubscribe behavior, and the intended transactional
   Postmark stream. Register both vendors' event callbacks and test synthetic
   payloads locally; use an explicitly authorized test address for live checks.
3. Pause legacy publishing and preference writes for a controlled migration
   window. Export ActiveCampaign's four list states, original consent evidence,
   and every vendor's suppression records. Resolve contradictory records in
   favor of suppression. Unknown consent remains excluded. Import locally,
   compare counts, and inspect samples privately. Preserve old send receipts.
4. Verify service backup/restore, webhook delivery, export authorization, and
   provider suppression reconciliation. Set up monitoring of webhook failures,
   rejected requests, and unresolved jobs. Keep callbacks working after retiring
   a provider; delayed opt-outs must still reach the portable ledger.
5. Deploy the site with the service URL/key configured. Verify the real signup
   path, add/replace preferences, and lead-magnet downloads. Remove site-side
   AC and Postmark secrets only after confirming all live callers moved.
6. Enable service delivery only after an authorized real inbox test proves the
   Kit template and unsubscribe propagation. Resume the existing
   `npm run newsletter:post -- --slug <slug>` workflow. Dry run remains read-only;
   preview remains explicit; send verifies the public essay URL; resend requires
   a reason. Service receipts mean accepted, not delivered.

## Rollback

Disable new service sends first. Stop publishing while reconciling every
processing/needs-review/accepted service job with provider records; never replay
an uncertain send through the old system. Export all preference changes and
suppression tombstones accumulated since cutover and apply them to the rollback
provider before restoring its delivery workflow. A code revert alone loses those
changes and is not a safe rollback. Restore the previous site revision and vendor
configuration only after that reconciliation. Keep service webhooks receiving
late events and merge them into the rollback provider. Restore service storage
from a tested backup if infrastructure fails; do not start with an empty DB.

## Bounded implementation trail

1. Source inventory: confirmed repository Markdown publishing, four audiences,
   an old vendor-embed compatibility component, and no current account-mail CMS.
2. Service increment: SQLite migration and audit ledger, offline import/export,
   scoped API keys, Kit adapter, Postmark transactional adapter, signed event
   handling, conservative idempotency and publication duplication guards.
3. Site increment: stable service client, signup API, accessible form wrapper,
   preview/test paths, provider-neutral publication receipts. Kept dry run,
   public URL verification, legacy interrupted-send guard, and explicit resends.
4. Verification: 11 service tests and 213 site tests passed; strict type checks,
   lint and production build passed, as did HTTP startup/auth/storage smoke checks
   and desktop/mobile signup interaction (1280px and 390px). UI tests use
   synthetic intercepted subscription responses, not live contacts or messages.

Remaining operational gates: hosting/volume selection, actual Kit plan access,
validated email template and inbox receipt, live callback delivery, consent-backed
migration, suppression reconciliation after outages, and production acceptance.
No automatic reactivation, scheduled reconciliation worker, or vendor automation
migration is included. A different transactional vendor remains an optional
future adapter decision; Postmark continues behind the boundary in this build.
