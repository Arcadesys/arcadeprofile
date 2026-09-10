# Arcades email service

A separately runnable Node 22 service. SQLite is the authority for subscribers,
audience preferences, consent evidence, suppressions, and delivery attempts.
Kit receives subscriber copies only when preparing a newsletter. Postmark remains
the transactional adapter. The Next.js site holds no delivery-vendor credentials.

## Run

```sh
npm ci
npm run check
npm test
npm start
```

Run from this directory with these environment variables supplied by your host's
secret store (the process does not automatically read dotenv files):

| Variable | Purpose |
| --- | --- |
| `EMAIL_DATABASE_PATH` | Absolute private persistent path, e.g. `/data/email.sqlite` |
| `EMAIL_SUBSCRIBE_KEY` | Random key, at least 32 characters; only subscription access |
| `EMAIL_ADMIN_KEY` | Different random key, at least 32 characters; delivery/export access |
| `EMAIL_FROM` | Verified sending address |
| `KIT_API_KEY` | Kit V4 API key |
| `KIT_WEBHOOK_SECRET` | Modern webhook endpoint signing secret |
| `POSTMARK_SERVER_TOKEN` | Transactional Postmark server token |
| `POSTMARK_TRANSACTIONAL_STREAM` | Transactional stream; default `outbound` |
| `POSTMARK_WEBHOOK_KEY` | Independent webhook password |
| `EMAIL_SENDS_ENABLED` | Only literal `true` enables delivery; omitted means disabled |
| `HOST`, `PORT` | Defaults `127.0.0.1`, `4318` |

Use the Dockerfile with a persistent `/data` volume for an independent deployment.
Run one service instance on a private volume behind HTTPS. Do not put SQLite on
an ephemeral/serverless filesystem or shared network volume. Limit access to the
database directory; it contains personal data. Back up using SQLite's backup API
or stop the service before copying its database and WAL together. Test restores.

## Stable API, version 1

All responses are JSON, never cacheable. Auth is `Authorization: Bearer <key>`.
Do not expose either key to browsers. `/health` is a process health check only.

- `POST /v1/subscribers` uses the subscription key: `{email, audiences,
  updateMode: "add" | "replace", source, policy: "writing-updates-v1"}`.
  Audiences are `all`, `fiction`, `essays`, `lab`. All means fiction and essays;
  Lab stays independent. The response includes canonical `audiences` and
  `suppressed`. A public signup never clears a suppression. The policy records
  the site's existing writing-updates promise; this is a signup assertion,
  not verified mailbox ownership or double opt-in.
- `POST /v1/broadcasts` uses the admin key: `{id: UUID, publicationKey,
  subject, htmlBody, textBody, audiences, resendReason?}`. Same ID and content
  returns the existing job. Different content conflicts. A new ID for an
  accepted publication requires a reason; unresolved publications block repeats.
- `POST /v1/transactional` uses the admin key: `{id: UUID, to, subject,
  htmlBody, textBody}`. Newsletter opt-outs do not block necessary transactional
  messages; hard bounces and complaints block both routes.
- `GET /v1/export` uses the admin key. Versioned JSON includes the complete
  portable ledger, suppression tombstones, provider IDs, and job states. Protect
  this export as personal data. It is not a public analytics endpoint.

Jobs are `processing`, `accepted`, or `needs_review`. Accepted means provider
acceptance, not completed delivery. A timeout or process crash is intentionally
not retried automatically: inspect the provider using the job UUID in Kit's
broadcast description or Postmark's `service_request` metadata. Keep the job
blocked until the result is known. There is no automatic job reset endpoint.

Kit uses a unique per-job tag and an explicit tag filter, never the full Kit
account. Existing non-active Kit copies produce local suppression tombstones.
A final local check stops removed/suppressed recipients before submission.
Once Kit accepts a broadcast, it owns delivery timing; subsequent preference
changes apply to later broadcasts, and Kit's own unsubscribe state governs its
queued delivery. Do not edit service-owned tags or send other campaigns to them.
The adapter does not run marketing sequences or transfer automation definitions.

## Incoming events

Configure modern Kit `/v4/webhook_endpoints` with:
`subscriber.unsubscribed`, `subscriber.bounced`, `subscriber.complained` and URL
`https://<service>/webhooks/kit`. Save the returned signing secret. The handler
verifies timestamped HMAC over raw bytes, allows rotation signatures, rejects
replays older than five minutes, validates batches, and deduplicates by event ID.
Unknown-address events create suppression tombstones. Activation events never
clear them. No reactivation workflow is implemented in this increment.

For Postmark, configure Bounce, SpamComplaint, and SubscriptionChange webhooks
at `https://postmark:<POSTMARK_WEBHOOK_KEY>@<service>/webhooks/postmark` using
Basic authentication. URL-encode the password if required. Monitor delivery
failures and paused webhook types; both vendors have finite retry windows.
Reconcile vendor suppression exports before migration and after webhook outages.
There is no scheduled reconciliation worker in this increment.

## Offline import

Stop the service. Prepare a private JSON file with the following shape. Include
only subscribers with documented consent, and **all** historical suppression
records, including addresses without an active subscriber row:

```json
{
  "subscribers": [{
    "email": "reader@example.com",
    "audiences": ["essays"],
    "source": "legacy-import",
    "policy": "original documented promise",
    "consentedAt": "2026-09-01T12:00:00Z",
    "evidence": "private source record reference"
  }],
  "suppressions": [{
    "email": "other@example.com",
    "reason": "unsubscribed",
    "source": "legacy-provider",
    "occurredAt": "2026-09-02T12:00:00Z"
  }]
}
```

```sh
npm run import -- /private/import.json /private/email.sqlite
```

Validation precedes one atomic transaction. Existing subscriber/job databases
are rejected; duplicate normalized addresses are rejected. Never manufacture
consent dates from import time. This command only writes the local service DB;
it does not upload contacts or send messages. For full service restores use the
SQLite backup, which preserves jobs and idempotency history as well as consent.
