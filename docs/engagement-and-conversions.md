# Engagement and conversion contract (proposed refinement)

This pass is a draft change, not a production release. It preserves the UUIDv7 session repair, existing identities, events and saved dashboards. PostHog is authoritative for these explicit participation reports; do not add its totals to Vercel totals. The new meter sends PostHog only. Existing reader actions still retain their previous Vercel routing.

## Visible active reading estimate

`reading-engagement` is the only new engagement family. It applies to the existing `ReaderTelemetry` bodies (essays, fiction, chapters and project reader bodies), not every discovery page, toy or MFF sub-event. Existing `reading-start` and `end-reached` remain unchanged arrival signals. The start/end marker bounds measure the rendered body extent, including media, rather than words read.

The meter counts monotonic seconds only while the document is visible, focused and the body intersects the viewport. Focus in an input, textarea or select pauses it. Arrival permits 60 seconds of quiet reading; focus, pointer/key activation and scrolling refresh this allowance. No values, key names, coordinates or text are retained. After 60 seconds without activity it stops counting until another activity. Hidden, blurred and offscreen time is excluded. Timer gaps over five seconds and clock rollback contribute no inferred time. Total measured time caps at 1,800 seconds.

There is no network heartbeat. At most three cumulative milestones (30, 120 and 300 seconds) and one changed final snapshot are emitted per mounted visit. `pagehide` or navigation/unmount flushes once; duplicate cleanup and unchanged snapshots do not emit again. A BFCache restore starts a fresh meter. Visibility changes pause/resume without a network receipt. Mobile process termination, blocked scripts or failed keepalive can lose the final snapshot: absence is unknown, not zero engagement. A short visit may have only a final snapshot, and an immediate unmount emits nothing.

| Property | Allowed meaning |
| --- | --- |
| `engagement_version` | Receiver-derived `visible_active_v1` |
| `engagement_checkpoint` | `30s`, `120s`, `300s`, `final` |
| `active_seconds` | Cumulative whole seconds, 1–1,800; never sum snapshots |
| `depth_percent` | Maximum visible extent, bucketed to 0/25/50/75/100 |
| `canonicalId`, `contentType`, `placement`, `destination` | Existing bounded reader context; canonical ID must equal the measured public pathname |

Main captures the original sanitized public page, entry and existing session/window/visitor context when mounting the meter. A cleanup after URL navigation cannot relabel the old summary as the new page or capture a token URL. No meter storage or extra visit identifier is introduced. These estimates do not establish attention, comprehension, reading completion or a unique human.

## Existing events and additive intent stages

| Event | Stage / unit |
| --- | --- |
| `reading-start`, `end-reached` | Existing start/end arrival, once per mounted reader context |
| `onward-reading` | Existing next-reading activation, distinct destinations per mounted context |
| `resume-click` | Existing **resume reading** action; never résumé intent |
| `site link clicked` + `destination_kind=resume` | `resume_navigation_intent`, exact Work résumé link |
| `site link clicked` + `destination_kind=resume_pdf` | `resume_download_intent`, exact Work résumé PDF link; not a saved file |
| `site link clicked` + `link_kind=contact` | `contact_intent`, mail link activation; no address/subject/body is retained |
| `signup request submitted` | `request_intent`, valid selected-list form submission, once per mounted control/context |
| `signup request failed` | `request_failed`, network/rejected or partial request; no error text |
| `signup confirmation requested` | Existing accepted-response event, `verification_request_accepted`; **not** confirmed subscription |

Existing `signup-success` remains the Vercel acceptance name. Its PostHog mapping stays `signup confirmation requested`. Browser request/acceptance signals intentionally do not reveal whether an address was suppressed or already active. Confirmation/unsubscribe routes remain excluded.

Provider outcomes already have daily, atomic `writing:metrics:YYYY-MM-DD` fields `first_party_verified` and `kit_active_ready`. The former is a claimed first-party challenge; the latter requires verified Kit-active readiness and requested preference synchronization. They are request transitions, not unique subscribers or delivery receipts. Read aggregate hashes only, never join email digests, tokens or Kit IDs to PostHog identities. Provider totals cannot supply an attributed browser conversion rate.

## New report definitions and migration

Create new versioned reports only after an approved release and observed receipts. Preserve the old reader dashboard and its fixed 53-path, www-only historical cohort. Give the new body cohort its own explicit manifest/revision; do not silently widen historical paths or rewrite old counts. Record both cutovers (session repair versus this engagement pass). New fields are absent historically; do not backfill or treat them as historical zeros.

Apply one half-open UTC interval (`start <= timestamp < end`), production canonical `hostname=www.thearcades.me`, `analytics_surface=sitewide`, and the same traffic cohort to **every** participating event. Exclude `utm_campaign=analytics-verification`. Exclude the known untagged controlled-test interval 2026-10-04 21:36:30–21:43:50 UTC from organic historical claims, documenting endpoint inclusivity with the reporting reviewer. Native bounce/duration will change as explicit engagement events are added; they remain event-spacing diagnostics, not active time. Use the same raw or Regular cohort in both numerator and denominator.

| New report | Denominator | Numerator / value |
| --- | --- | --- |
| Reader participation | Distinct non-null `(session, public content path)` with an eligible pageview | Same key also has `reading-start`, unordered within the interval |
| Meter coverage | Same eligible session/content keys with pageviews | Same key has any versioned engagement snapshot |
| Engaged exposure | Same pageview keys; show coverage alongside rate | Same key has MAX(`active_seconds`) ≥30 and MAX(`depth_percent`) ≥50 |
| Observed time/depth | Measured keys only, explicitly labelled | Per-key maxima; median/time distribution, never SUM cumulative snapshots |
| Reading continuation | Reader-participating session/content keys | Matching `onward-reading` activation; destination arrivals measured separately |
| Newsletter request | Same-site sessions with eligible pageviews | Sessions participating in submitted and accepted request events; request rates use submitted sessions as denominator |
| Professional/contact intent | Same-site sessions with eligible pageviews | Existing link event with the exact intent stage, counted once per session for a rate |

Reader receipts have arrived 43–71 ms before pageviews in natural production traffic. React effect order and ingestion delay do not establish reading order. Use unordered participation on the same session/content key, not a strict `$pageview → reading-start` timestamp funnel. Client regression coverage demonstrates both effect orders with matching path/session/campaign. No cross-site visitor/session join is allowed; Work arrivals are separate referral/campaign aggregates. Repeated same-session visits to a piece collapse under this conservative MAX/key definition, so do not call it total visit time or distinct readership.

## Validation and rollout gate

Tests exercise visibility, focus/input, idle, depth, suspension, repeats, navigation, BFCache, cleanup/pagehide, storage failure, payload bounds and reader effect ordering. Transport uses bounded keepalive POSTs and drops malformed snapshots at both boundaries. No subscriber/provider writes, credential/configuration changes or dashboard edits are part of this pass.

Do not merge/deploy this draft without approval. Existing production smoke checks concern the earlier release only. Chrome returned `ERR_BLOCKED_BY_CLIENT` before browser QA; protections were not changed and no alternate browser bypass was attempted. After an approved release, a supported browser journey needs exact `?utm_campaign=analytics-verification` on every URL and reviewed report exclusions before capture. Verify outgoing payload, receiver acknowledgment, PostHog receipt and session materialization separately. Rollback reverts the additive collector/events; legacy receipts and historical reports remain readable.

Frozen main/Hack flushes are discarded on clock rollback or after 30 minutes without a reading capture or at the original UUIDv7 session’s 24-hour limit; they never rotate an old reading estimate into a new session. Valid checkpoints refresh the existing same-session tab state without creating a new identity. Network/unload loss remains possible.
