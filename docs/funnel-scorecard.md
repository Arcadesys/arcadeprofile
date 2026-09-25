# Reader funnel scorecard

## Event and count definitions

Use PostHog events from `www.thearcades.me`, filtered to `analytics_surface=sitewide` and the requested date range. Exclude `/subscribe/verify` and `/subscribe/unsubscribe`; those pages are excluded in the client because their fragments or parameters can contain bearer tokens.

| Step | Source | Meaning |
| --- | --- | --- |
| Reader entry | `$pageview`, `landing_page` | Public reading-page view. The property follows the current route, so count pageviews to the reading-page set as the traffic denominator. |
| Piece start | `reading-start`, `canonicalId`, `contentType`, `placement` | Reader telemetry mounted for the piece. |
| End reached | `end-reached`, `canonicalId`, `contentType`, `placement` | The end marker became visible; it does not prove the whole piece was read. |
| Next read | `onward-reading`, `canonicalId`, `destination` | Reader activated a next-reading link; this is intent to continue. |
| Signup request | `signup confirmation requested`, `canonicalId`, `placement` | First-party signup request was accepted and a confirmation step was requested. It does not establish that the reader clicked the confirmation link. |
| Professional handoff click | `site link clicked`, `destination_host=work.thearcades.me`, `link_kind=external` | Activation of a professional-work link; this is intent. Compare its aggregate count with work-site arrivals tagged by the handoff campaign, without joining visitors. |
| First-party verified | Daily Redis aggregate `first_party_verified` | A signed confirmation action was claimed once by the first-party endpoint. Count is by UTC day and is independent of PostHog identity. |
| Kit-active ready | Daily Redis aggregate `kit_active_ready` | Kit reported the verified subscriber active and the stored audience updates completed. This is eligibility for Kit delivery, not proof that an email or broadcast was delivered. Count is by UTC day and is independent of PostHog identity. |

Reader event capture is page-lifetime deduplicated. For PostHog pathway analysis, the site has an anonymous persistent browser identifier but no session identifier; describe any progression as same-browser-ID activity in the reporting window, not a session or a unique person. `end-reached` does not prove the whole piece was read. `onward-reading` and signup requests are intent. The existing reader events send piece path/type and UI placement, never email, token, or audience selections.

The Redis aggregates are written atomically with the challenge status transition. A single explicit verification claim increments `first_party_verified`; the later successful transition to `complete` increments `kit_active_ready`. Retries and repeated completion attempts cannot increment either stage again. These are request-transition counts, not unique subscriber counts; one address may make more than one request. The counters contain only the stage totals, use `writing:metrics:YYYY-MM-DD` hashes, and expire after 400 days. Read them with `HGETALL writing:metrics:YYYY-MM-DD`; do not export the challenge ledger or join totals to PostHog visitors, email addresses, subscriber IDs, or tokens.

## 14-day comparison

Use 14 complete calendar days immediately before the reader-path release and the 14 complete calendar days immediately after it. Report PostHog timestamps and Redis buckets in UTC. Record the release time, query/export date, and any deployment interruption. Keep the event filters identical in both windows.

| Metric | Pre (14 days) | Post (14 days) | Definition / source |
| --- | ---: | ---: | --- |
| Eligible reading-page entries | — | — | `$pageview` landing page in the public reading-page set |
| Piece starts | — | — | `reading-start` |
| Ends reached | — | — | `end-reached` |
| Next-reading clicks (intent) | — | — | `onward-reading` |
| Signup requests (intent) | — | — | `signup confirmation requested` |
| Professional handoff clicks (intent) | — | — | `site link clicked`, destination host `work.thearcades.me` |
| First-party verifications | N/A before aggregate deployment | — | Sum daily Redis `first_party_verified` |
| Kit-active ready states | N/A before aggregate deployment | — | Sum daily Redis `kit_active_ready`; not an email delivery receipt |

Show raw counts with each rate. Calculate start/entry, end/start, next-read/end, and signup-request/end rates using anonymous browser-ID pathway counts within the same eligible page cohort and date window; keep reader content type separate. Do not connect first-party or Kit-active aggregates to browser IDs or calculate rates from those provider counts. Mark low-volume rows as insufficient evidence; do not infer conversion improvement from a small number of events.

## Work handoff

The professional cards on this site link to `https://work.thearcades.me` with `utm_campaign=professional_handoff`; `utm_content` distinguishes `home_header`, `home_entry`, and `start_entry`. The work-site PostHog pageview keeps the campaign and landing page; use `referring_domain=www.thearcades.me` as fallback. Continue with the work site's case-study and contact/booking steps using its own same-session events. Do not join identities across the two sites. The matching scorecard is in the work-site repository at `docs/funnel-scorecard.md`.
