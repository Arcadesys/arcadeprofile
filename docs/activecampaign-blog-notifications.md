# ActiveCampaign + Postmark blog notifications

ActiveCampaign is the subscriber/list source of truth. Postmark sends the per-post newsletter email when the scheduled publish job promotes due posts.

## Flow

1. A trusted scheduler calls `GET` or `POST /api/posts/publish-scheduled` with `Authorization: Bearer <CRON_SECRET>`.
2. Due posts move to `publish_status: published` and get `publishedDate` from `scheduledPublishDate`.
3. The publish job resolves the post audience:
   - fiction: `AC_LIST_ID_ALL_PERPOST` + `AC_LIST_ID_FICTION_PERPOST`
   - everything else: `AC_LIST_ID_ALL_PERPOST` + `AC_LIST_ID_ESSAYS_PERPOST`
4. The app fetches active contacts from ActiveCampaign with `GET /api/3/contacts?listid=<id>&status=1`, paginates through the results, and dedupes email addresses across lists.
5. The existing newsletter renderer builds HTML/text, and Postmark sends one message per recipient through `sendEmailBatch`.
6. On success, the post stores `newsletterSend` state and moves to `publish_status: sent`. On failure, the post remains public as `published`; `newsletterSend.status` becomes `failed`, and a later cron run retries it.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AC_API_URL` | Yes* | ActiveCampaign API base URL, no path. |
| `AC_API_KEY` | Yes* | ActiveCampaign API token. |
| `AC_LIST_ID_ALL_PERPOST` | Yes | Numeric AC list ID for all per-post subscribers. |
| `AC_LIST_ID_FICTION_PERPOST` | Yes | Numeric AC list ID for fiction per-post subscribers. |
| `AC_LIST_ID_ESSAYS_PERPOST` | Yes | Numeric AC list ID for essay per-post subscribers. |
| `POSTMARK_SERVER_TOKEN` | Yes | Postmark server token used for delivery. |
| `POSTMARK_FROM_EMAIL` | Yes | Verified sender address in Postmark. |
| `POSTMARK_FROM_NAME` | No | Defaults to `The Arcades`. |
| `POSTMARK_BROADCAST_STREAM` | No | Message stream for newsletters; falls back to `POSTMARK_NEWSLETTER_STREAM`, then `outbound`. |

\*Aliases accepted for subscribe/list APIs: `ACTIVECAMPAIGN_API_URL`, `ACTIVECAMPAIGN_API_KEY`, and `ACTIVECAMPAIGN_LIST_ID`.

## Idempotency and failures

- `suppressNewsletter` skips delivery and records `newsletterSend.status: skipped`.
- `newsletterSend.status: sent` is treated as terminal and will not send again.
- `newsletterSend.status: failed` is retryable; the scheduled publish endpoint looks for already-public failed posts and tries them again.
- Postmark acceptance is the success boundary. Bounce/complaint handling remains a Postmark webhook concern.

## References

- [ActiveCampaign API overview](https://developers.activecampaign.com/reference/overview)
- [ActiveCampaign contacts API](https://developers.activecampaign.com/reference/list-all-contacts)
- [Postmark batch email API](https://postmarkapp.com/developer/api/email-api#send-batch-emails)
