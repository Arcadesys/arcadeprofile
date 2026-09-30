# Reader funnel scorecard

## Event and count definitions

Use PostHog events from `www.thearcades.me`, filtered to `analytics_surface=sitewide` and the requested UTC date range. Current-page eligibility is the exact public-path allowlist in `data/analytics-public-paths.json`, enforced by the browser and receiver. Verification, unsubscribe, thanks, unknown/private and preview routes are excluded. The detailed payload and eligibility contract is in [analytics-minimization.md](./analytics-minimization.md).

For a reading-page report, derive and record the eligible reader-route set from the public catalogue returned by `getReadingCatalog` in `lib/reading-catalog.ts`. The analytics allowlist also contains hubs and utility pages; it is not itself the reading-page denominator.

| Step | Source | Meaning |
| --- | --- | --- |
| Reading-page view | `$pageview`, `pathname` | Receipt for the current public reading page. Filter `pathname` (or its equivalent `$pathname`) to the eligible reading-page set; repeated visits can produce repeated receipts. |
| Session entry context | `landing_page` | Saved eligible entry pathname, initialized from the current page when valid stored entry context is unavailable and reused while that context remains valid. It does not identify the first provider-received event, follow the current route, or supply the reading-page-view denominator. Use only for separately labelled entry-source analysis. |
| Piece start | `reading-start`, `canonicalId`, `contentType`, `placement` | Reader telemetry mounted for the piece. |
| End reached | `end-reached`, `canonicalId`, `contentType`, `placement` | The end marker became visible; it does not prove the whole piece was read. |
| Next read | `onward-reading`, `canonicalId`, `destination` | Reader activated a next-reading link; this is intent to continue. |
| Signup request | `signup confirmation requested`, `canonicalId`, `placement` | First-party signup request was accepted and a confirmation step was requested. It does not establish that the reader clicked the confirmation link. |
| Professional handoff click | `site link clicked`, `destination_host=work.thearcades.me`, `link_kind=external` | Activation of a professional-work link; this is intent. Compare its aggregate count with work-site arrivals tagged by the handoff campaign, without joining visitors. |
| First-party verified | Daily Redis aggregate `first_party_verified` | A signed confirmation action was claimed once by the first-party endpoint. Count is by UTC day and is independent of PostHog identity. |
| Kit-active ready | Daily Redis aggregate `kit_active_ready` | Kit reported the verified subscriber active and the stored audience updates completed. This is eligibility for Kit delivery, not proof that an email or broadcast was delivered. Count is by UTC day and is independent of PostHog identity. |

Reader event capture is deduplicated per event/control/context during one mounted visit. A genuine remount or return visit can produce another receipt. Sitewide `$pageview` is once per path transition; `site link clicked` counts eligible activations and is not the same unit as a deduplicated reader next-action event.

The collector uses a pseudonymous browser UUID in localStorage and a separate UUID in sessionStorage for sitewide `$session_id` and `$window_id` (the same value for both fields). This is the lifetime of the stored browser-tab context, not a verified person or a provider-defined inactivity session; the code does not rotate it after an inactivity timeout. Restored valid IDs and entry context are reused across path changes. Storage failures can fragment activity across newly generated IDs, and a new tab with an opener can initially inherit [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), so do not call these counts unique people or exact tab counts. MFF events have their own `analytics_surface=mff_manifesto` and do not receive these session/window IDs. Do not sum MFF and sitewide receipts or join identities across sites.

`end-reached` means that the end marker became visible, not that the whole piece was read or understood. `onward-reading` and signup requests are intent. The existing reader properties contain public piece path/type and UI placement, never email, token, or audience selections. The full payload retains the identifiers described above; it is not anonymous measurement.

The Redis aggregates are written atomically with the challenge status transition. A single explicit verification claim increments `first_party_verified`; the later successful transition to `complete` increments `kit_active_ready`. Retries and repeated completion attempts cannot increment either stage again. These are request-transition counts, not unique subscriber counts; one address may make more than one request. The counters contain only the stage totals, use `writing:metrics:YYYY-MM-DD` hashes, and expire after 400 days. Read them with `HGETALL writing:metrics:YYYY-MM-DD`; do not export the challenge ledger or join totals to PostHog visitors, email addresses, subscriber IDs, or tokens.

## 14-day comparison

Use 14 complete calendar days immediately before the selected release and the 14 complete calendar days immediately after it only when collection coverage and definitions are comparable. Report PostHog timestamps and Redis buckets in UTC. Record the release boundary, query/export date, host/surface filters, known outages and incomplete coverage. The production/public-path and duplicate-event exclusions change receipt coverage; identical query filters alone do not make pre/post totals comparable or establish growth. Leave unavailable rows unmeasured rather than treating missing coverage as zero.

| Metric | Pre (14 days) | Post (14 days) | Definition / source |
| --- | ---: | ---: | --- |
| Eligible reading-page views | — | — | `$pageview` with current `pathname` in the public reading-page set |
| Piece starts | — | — | `reading-start` |
| Ends reached | — | — | `end-reached` |
| Next-reading clicks (intent) | — | — | `onward-reading` |
| Signup requests (intent) | — | — | `signup confirmation requested` |
| Professional handoff clicks (intent) | — | — | `site link clicked`, destination host `work.thearcades.me` |
| First-party verifications | N/A before aggregate deployment | — | Sum daily Redis `first_party_verified` |
| Kit-active ready states | N/A before aggregate deployment | — | Sum daily Redis `kit_active_ready`; not an email delivery receipt |

The table reports raw receipt or request-transition counts, not a conversion funnel. Do not divide its rows into conversion rates: page transitions, mounted reader milestones, link activations and request transitions have different units. A separate pathway analysis must first define the same eligible content cohort, event order, deduplication rule, identifier/storage limitations and time window for every step. Show its numerator and denominator explicitly and keep content types separate; a visit need not include every step. Do not connect first-party or Kit-active aggregates to browser IDs or calculate rates from those provider counts. Mark low-volume or incomplete rows as insufficient evidence; do not infer conversion improvement from a small number of events.

## Work handoff

The existing professional cards on this site link to `https://work.thearcades.me` with `utm_campaign=professional_handoff`; `utm_content` distinguishes `home_header`, `home_entry`, and `start_entry`. These are retained campaign labels; this scorecard changes neither existing links nor campaign behavior.

Report creative handoff activations separately from work-site arrival receipts, using the work site's own verified filters and current-page/entry-context definitions. Do not assume the creative `analytics_surface` filter applies to the work collector. Campaign labels and `referring_domain=www.thearcades.me` can describe aggregate arrival attribution where received; a missing label is unknown, not proof of another source. Do not assume the sites' session units match, join identities across them, or call a handoff click a professional conversion. The work-site scorecard is in its repository at `docs/funnel-scorecard.md`.
