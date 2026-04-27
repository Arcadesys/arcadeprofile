# Postmark + Payload wiring plan

This repo now routes Payload CMS email through Postmark SMTP via `@payloadcms/email-nodemailer` in `lib/payload-email.ts` and `payload.config.ts`.

## Current state

- Payload email adapter is Postmark-backed when `POSTMARK_SERVER_TOKEN` is present.
- Optional fail-fast guard in production via `POSTMARK_REQUIRED_IN_PROD=true`.
- In non-production, email is intentionally disabled when the token is missing.
- Webhook endpoint: `POST /api/postmark/webhook` for bounce/complaint/subscription-change processing.
- Optional webhook auth token via `POSTMARK_WEBHOOK_SECRET` (`x-postmark-webhook-token` header or `Authorization: Bearer ...`).

## Rollout plan

1. **Environment hardening**
   - Set `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL`, and optional `POSTMARK_FROM_NAME` in each environment (local, preview, production).
   - Verify sender signature/domain in Postmark for `POSTMARK_FROM_EMAIL`.

2. **Payload smoke test path**
   - Add/keep a small route or script that calls Payload email send and confirms a 200 response from Postmark.
   - Run this once per environment after deploy and store result in deploy logs.

3. **Observability**
   - Add Postmark webhook endpoint(s) for bounce, spam complaint, and delivery events.
   - Correlate webhook events to user/subscriber records (email + message ID metadata).

4. **Template consistency**
   - Centralize transactional template generation so Payload auth emails and custom Postmark sends share consistent branding.
   - Consider moving high-value transactional messages to Postmark Templates and send by template alias.

5. **Optional future cleanup**
   - Evaluate replacing SMTP transport with a direct Postmark API adapter for Payload if/when Payload exposes a first-party Postmark adapter that fits this codebase.

## Acceptance checklist

- [ ] Payload boots in production with Postmark env vars set.
- [ ] If desired, `POSTMARK_REQUIRED_IN_PROD=true` causes production boot to fail when `POSTMARK_SERVER_TOKEN` is absent.
- [x] A test email can be sent through `/api/email/test` and delivered from Postmark (when credentials are set).
- [x] Bounce/complaint webhooks are captured and logged via `/api/postmark/webhook`.
