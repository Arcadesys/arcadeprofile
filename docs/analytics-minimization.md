# Public analytics payload contract (issue 292)

The proposed bounded engagement/request-stage extension is documented in [engagement and conversions](engagement-and-conversions.md), preserving this eligibility and privacy boundary.

This is a code-only reduction of existing analytics. It installs no provider,
changes no dashboard/configuration/retention, and makes no subscriber writes.
Do not merge or deploy this draft as part of validation without approval.

## Eligibility and source of truth

- Browser: production build, exact HTTPS origin `https://www.thearcades.me`,
  and an exact published path. `NEXT_PUBLIC_VERCEL_ENV`, if present, must be
  `production`; its absence does not disable the genuine production origin.
- PostHog receivers: production `NODE_ENV`, `VERCEL_ENV` absent or `production`,
  and the actual request URL on that exact origin. Submitted/forwarded hosts are
  never used as authority. If supplied, the HTTP Origin must match too.
- The claimed event URL must independently match the production origin and an
  eligible public path. Contradictory submitted host/path fields are rejected.
- `npm run build:analytics-manifest` generates deterministic, source-owned JSON
  public-path, reader-reporting and MFF-label manifests. Both `prebuild` and `predev` run it **before** the
  existing furry-history-board build. No dependency or lockfile change is needed.
- Paths come from the static sitemap catalog, published Markdown posts and their
  nonempty groups, and published Lab case studies. Retained creative editions
  remain measurable even when their professional canonical is excluded from the
  sitemap. Audited extras are Start, Subscribe, Queer Columns and its public notes.
  MFF is separately eligible only while its explicit `MFF_PUBLIC` flag is true.
- Both sides of private route rewrites are excluded. There is no wildcard path
  fallback. Unknown paths, future/draft pieces, APIs, verification/unsubscribe
  variants and the noindex Subscribe thanks page cannot be captured. One trailing
  slash is normalized; encoded paths and repeated slashes are not allowlisted.
- To add a new catalog-owned page, run the generator and commit its result with
  the content change. Add an intentionally public static page missing from those
  catalogs to the explicit extras only after checking its publication policy.
  There is no automatic discovery of new filesystem routes. CI parity tests catch
  stale manifests; generation failures fail the build instead of widening capture.
  Directly invoking `next build` skips npm lifecycle generation, so use npm scripts.
  Publication-date eligibility reflects the build; scheduled publication still
  requires the repository's normal new commit/deployment.

## PostHog contract

Both callers and receivers use the same allowlist. Receivers reconstruct a new
payload; they never spread arbitrary submitted properties into provider requests.

Shared safe context is public `pathname`, `$pathname`, `$host`, `hostname`,
`$current_url` rebuilt from the approved origin/path, and a fixed surface.
The existing optional landing page must also be public. Referrers are HTTP(S)
origin only, without credentials/path/query/hash. Sitewide `referring_domain` is
derived from that origin, never accepted independently. Existing campaign labels
are lowercased and must match `[a-z0-9_-]{1,64}`; sitewide allows source, medium,
campaign, content and term; MFF retains its existing source/medium/campaign only.
`professional_handoff`, `home_header`, `home_entry` and `start_entry` survive.

The event names and units remain:

- `$pageview`: one per mounted site path transition. Same-path query/hash changes
  do not add one; public A → B → A does. Strict Mode replay is deduplicated; a real
  remount is a fresh visit. This is a visit receipt, not a reader outcome.
- `site link clicked`: each eligible link activation, safe internal public `href`
  or the existing professional origin, `link_kind`, and `destination_host`.
- `reading-start`, `end-reached`, `onward-reading`, `resume-click` and
  `signup confirmation requested`: existing public `canonicalId`, content type,
  placement and safe destination. Keep `reader-end` completion placement and the
  exact merged professional canonical mappings. External destinations are only
  those exact canonical mappings and the two existing Work/TH4F subscription
  reading hubs. Queries/fragments are stripped. An unknown/private destination
  or invalid required reader field drops that event rather than inventing context.
- Reader dedupe stays once per event/control/context per mounted visit. Distinct
  onward destinations remain separate; repeated activation of the same reader
  control/context is still deduped, unlike sitewide link clicks. An end marker
  means reaching the end, not comprehension. `signup-success` still goes to Vercel;
  its PostHog mapping remains `signup confirmation requested`, not verification,
  Kit activation or delivery.
- MFF retains `$pageview` receiver compatibility and its existing page, scroll,
  section, exhibit, link and sources events, under `mff_manifesto`. Scroll accepts
  only 25/50/75/90/100. Section/heading/exhibit/link labels must exactly match
  bounded public JSX text from the manifest, not arbitrary live DOM text.
  Milestones/sections/exhibits/page receipt are once per mounted MFF visit through
  Strict Mode replay; a remount resets them. Links remain per activation; sources
  remains the existing first-details-open trigger. That pre-existing selector
  can target a Callout before the final sources panel; this patch does not claim
  to correct or validate a source-panel outcome. Non-HTTP links retain only the
  existing `other` classification and an allowlisted label, never an address.
  MFF external hrefs are reduced to origin; internal hrefs to public paths.
  MFF still coexists with the sitewide receipt; do not sum the two surfaces.

Valid existing UUIDv4 pseudonymous IDs keep their existing localStorage lifetime;
sitewide session/window UUIDs keep their sessionStorage lifetime. Invalid stored
IDs are replaced using the same generator/scopes. MFF does **not** gain session
IDs. Restored entry JSON is rebuilt through the allowlist and rewritten sanitized;
invalid/missing entry data uses fresh safe context. Storage failures and analytics
failures remain nonblocking. No cross-site identity joining is introduced.

Report distinct IDs as pseudonymous browser IDs, never people or anonymous readers.
The `end-reached` marker is an end-reached receipt, never a finished-read count.
Use the catalog-derived reader cohort and UTC bounds in [the scorecard](./funnel-scorecard.md)
when publishing aggregate reader reports.

Unapproved properties, person updates, supplied raw user agent, unsafe restored
context and raw URLs are excluded at these PostHog boundaries. Campaign validation
is structural, not semantic PII detection: never put secrets or personal data in
otherwise-valid campaign labels.
Existing server-added raw user agent and sitewide GeoIP setting remain unchanged,
as do provider inference/enrichment policies. This is minimization, not a claim
of anonymous or consent-free measurement. A future device/geo/ID policy change
requires a separate explicit decision and comparability review.

## Vercel boundary

The installed SDK's supported `beforeSend` URL reducer is registered both on the
site component and on the reader's early SDK injection, before passive reader
tracking. It rejects ineligible current/event paths and removes query/hash from
page/custom-event URLs. Already-injected scripts remain subject to that reducer
when a visitor navigates onto an excluded page. Reader custom properties pass the
same reader allowlist; toy custom calls gain the same current-page/host gate while
retaining their existing event/property semantics. No extra events are added.

The SDK exposes URL reduction here, not a full provider-side privacy-control API.
Do not infer that this patch changes hosted-script referrer/device enrichment,
project settings, ingestion retention or provider internals. PostHog still keeps
approved campaign fields; Vercel event URLs no longer carry UTM query strings.

## HTTP compatibility and rollout

- 200 `{ok:true}`: sanitized, accepted upstream request
- 204 empty: disabled deployment/request host; nothing is forwarded
- 400 `invalid_json` / `invalid_event`: malformed payload, unsupported event/ID,
  nonpublic path or conflicting/invalid context; nothing is forwarded
- 403 `invalid_origin`: supplied HTTP Origin differs; nothing is forwarded
- 502 `upstream_rejected` / `upstream_failed`: provider rejection/network failure

Both clients remain fire-and-forget and ignore response status. They do not parse
204 JSON, retry 4xx/5xx, or block reading/signup/navigation. Older cached clients'
known UUID/event/public-URL payloads remain accepted and sanitized; bad fields are
dropped, or required-context failures receive 400. Malformed primitive JSON now
receives a controlled 400 instead of an exception. Network failure on the sitewide
receiver now consistently returns 502, as MFF already did.

Expect fewer receipts when excluding preview/development/private/unknown traffic
and removing duplicate Strict Mode effects. URL and external-link cardinality
will shrink. Do not compare pre/post totals as growth without noting this boundary
change. Existing first-party verified/Kit-active-ready aggregate counters and
400-day retention are untouched; those outcomes remain separate from browser intent.

Review the mocked fixtures and verify preview capture stays off before an approved
release. After an independently approved deployment, permitted aggregate receipt
checks should verify the exact host/surface and known public event taxonomy; no
synthetic production events or real signups were submitted for this patch. Existing
analytics acceptance (#292) is not complete solely because code/tests pass.

Rollback is a reviewed code revert/deployment to the prior commit. No database,
provider setting, subscriber record or storage-schema migration is required. A
revert would restore the broader collection, so choose it deliberately rather than
using a preview-capture or path wildcard bypass.
