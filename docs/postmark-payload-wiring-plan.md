# Postmark + Payload operations

Postmark is the outbound email delivery layer for this repo. ActiveCampaign owns contacts, audience lists, subscription state, segmentation, consent, and marketing automation state; it does not send site newsletters.

## Delivery paths

- Payload CMS email uses Postmark SMTP through `@payloadcms/email-nodemailer` in `lib/payload-email.ts` and `payload.config.ts`.
- Per-post newsletters send through the Postmark API in `lib/postmark.ts`.
- Preview and transactional test sends use Postmark directly.
- ActiveCampaign list membership is read only to resolve newsletter recipients before Postmark delivery.

## Environment

- `POSTMARK_SERVER_TOKEN` enables Postmark sending.
- `POSTMARK_FROM_EMAIL` should be a verified Postmark sender.
- `POSTMARK_FROM_NAME` is optional and defaults to `The Arcades`.
- `POSTMARK_REQUIRED_IN_PROD=true` makes production boot fail if `POSTMARK_SERVER_TOKEN` is missing.
- `POSTMARK_BROADCAST_STREAM` selects the message stream for per-post newsletters; it falls back to `POSTMARK_NEWSLETTER_STREAM`, then `outbound`.
- `POSTMARK_TRANSACTIONAL_STREAM` selects the message stream for transactional/test sends; it defaults to `outbound`.
- `POSTMARK_WEBHOOK_SECRET` protects `/api/postmark/webhook` in production.

In non-production, Payload email intentionally falls back to a console/no-op adapter when the token is missing so local development can boot without email credentials.

## Webhooks

`POST /api/postmark/webhook` records delivery, bounce, open, click, spam complaint, and subscription-change events in `postmark-events`, then refreshes aggregate counts on `posts.newsletterSend`.

Configure Postmark modular webhooks on the newsletter stream for:

- Delivery
- Bounce
- Spam complaint
- Subscription change
- Open, only when `POSTMARK_TRACK_OPENS=true`
- Click, only when `POSTMARK_TRACK_LINKS` is enabled

The webhook route accepts `POSTMARK_WEBHOOK_SECRET` via Postmark Basic Auth URL, `x-postmark-webhook-token`, or `Authorization: Bearer ...`.

## Smoke Tests

- `npm run postmark:test -- reader@example.com` sends a direct Postmark test message.
- `POST /api/email/test` sends a protected test message through the same handler used by the route.
- `npm test` covers Postmark request shaping, webhook normalization, and newsletter delivery retry behavior with mocked clients.

## Operational Notes

- Accepted Postmark sends create `postmark-events` rows with `eventType: submitted`.
- `newsletterSend.status: sent` is terminal for per-post delivery retries.
- `newsletterSend.status: failed` is retryable by later scheduled publish runs.
- `suppressNewsletter` records `newsletterSend.status: skipped` and does not call Postmark.
