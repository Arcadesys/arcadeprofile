# Cross-imprint canonical map v1

Decision recorded: 2026-09-30. Issues: #285 and #286.

## Authority and scope

The shared root `AGENTS.md` policy in both repositories already prefers the work
imprint for the same or substantially duplicated professional article. The owner
approved execution of the reviewed issue plan on 2026-09-30. This record applies
that existing policy to the three verified duplicates below; it does not create
a blanket rule for all AI writing. The older `blocked: owner-decision` issue label
predates the shared policy and approved execution plan.

Retain all three creative editions at their existing routes. Change canonical,
social and structured-data document identity and definitive discovery links to
the work edition. No redirect, deletion, publication-date change, or new robots
restriction is authorized or included.

## Exact map

| Stable content key | Retained creative URL | Preferred work URL |
| --- | --- | --- |
| `bunch/bunch` | https://www.thearcades.me/projects/bunch/bunch | https://work.thearcades.me/blog/bunch |
| `arcade-blog/four-stages-nobody-tells-you-about` | https://www.thearcades.me/projects/arcade-blog/four-stages-nobody-tells-you-about | https://work.thearcades.me/blog/four-stages-nobody-tells-you-about |
| `the-singularity-log/claude-design-and-the-novel-t` | https://www.thearcades.me/projects/the-singularity-log/claude-design-and-the-novel-t | https://work.thearcades.me/blog/claude-design-and-the-novel-t |

The machine-readable implementation is `POST_CANONICAL_EDITIONS` in
`lib/post-canonical.ts`, version `2026-09-30.1`. It validates complete exact HTTPS
targets on the approved work host and rejects malformed, encoded, empty, query,
fragment, credential, port, and non-article targets. It is not a general
frontmatter override and makes no runtime request to the other site.

## Edition comparison and provenance

Compared the complete Markdown editions, including frontmatter, at creative
commit `2bcfae917dba9e3258965fa41448b050a4e323d8` and work commit
`193fc7b858caf4c8ace307bdbecde047230f9ac8`:

| Key | SHA-256 of each matching current Markdown edition | Original publication |
| --- | --- | --- |
| `bunch/bunch` | `90bc1168aab0e53defc7386a15b7187864534820286c6bdc03ceeafe8a0836c7` | 2026-09-09T10:00:00.000Z |
| `arcade-blog/four-stages-nobody-tells-you-about` | `5051b20cf79f84a7c110be1d6253d3b0f793fbb6f588e096e44f61ab4eb05c0c` | 2026-06-04T08:00:00.000Z |
| `the-singularity-log/claude-design-and-the-novel-t` | `5b369ece46a8a55f7174fcdab541fbc981d6e0d84d530dd71329dba99f96a38f` | 2026-05-14T00:00:00.000Z |

Creative files are `content/posts/<key>.md`; work files are
`content/blog/<final-key-segment>.md`. Every pair is byte-identical, rather than
merely sharing a title or topic. They therefore offer the same article to the
same reader, and the professional imprint is preferred under the shared policy.

Work `content/blog-sources.json` retains the original source URLs, import commit
references, and import-time hashes (which describe those earlier revisions, not
the current comparison). Work article pages retain their original-publication
attribution. No article body, frontmatter, source manifest, date or author is
changed by this implementation.

## Public destination evidence

Verified 2026-09-30 around 16:48–16:49 UTC from cloud compute using public HTTP
GETs and rendered browser metadata:

- All three exact work URLs returned direct HTTP 200 HTML without redirects
- Each emitted exactly its own preferred URL in `rel=canonical`, `og:url`,
  `BlogPosting.url`, and `BlogPosting.mainEntityOfPage`
- No `X-Robots-Tag`, robots meta, or googlebot meta excluded any destination
- Public `https://work.thearcades.me/robots.txt` returned 200 and allows `/`;
  its exclusions are `/journeys` and `/jobs`, not the three `/blog/` articles
- Public `https://work.thearcades.me/sitemap.xml` returned 200 and contains all
  three exact work URLs, plus the separate `/work/bunch` case study
- The existing work `lib/site-metadata.ts` helpers already implement the required
  self-canonical metadata and schema. They are reused as the destination contract;
  no replacement helper or redundant work-side change is needed

These are technical indexability checks, not evidence of Google's selected
canonical, search impressions or backlinks. Search Console coverage remains
separate under #291. Raw-HTTP verification of the creative production baseline
was blocked by two automatic-review service timeouts, not a demonstrated site
failure. Creative post templates at the pinned commit emit self-canonical URLs.

## Discovery, feeds, and preserved routes

- Creative sitemap excludes these three duplicate article entries only. Their
  public project collection pages and distinct articles remain included
- Home/latest/project lists, editorial hubs, search results and related-reading
  recommendations link to the preferred work edition through one shared helper
- Retained local route identity stays separate from discovery: legacy numeric
  redirects, reading-continuity IDs, local reader navigation and PDF routes remain
  valid. PDF links never append `/pdf` to the work canonical
- RSS retains each existing creative GUID, publication date and content so feed
  readers do not receive a new item identity. Only its clickable article link
  points to the work edition
- The generated `llms.txt` public-article list points to the same work edition;
  private and future content still pass through the existing public selector
- Existing campaign attribution links from #345 are untouched; their policy is
  reconciled separately under #290/#292

## Exclusions, deployment, and rollback

The distinct technical `https://work.thearcades.me/work/bunch` case study remains
self-canonical and is not in the map. Fiction, Open Port, résumé pages/PDFs,
private/draft/future content, and the pinned combined collection PDF are unchanged.
Unmapped articles retain their own canonical URLs.

Destination-first state is already verified. This change is prepared for review,
not merged or deployed. Before release, recheck the work URLs above and verify
emitted creative HTML on the candidate deployment, including query-string
requests, sitemap, RSS, llms, and retained PDF/legacy routes. If a destination
becomes unavailable or non-indexable, hold that mapping rather than redirecting
to a guessed replacement. Record the eventual PR, commit and deployment below.

Rollback is per piece: remove its explicit mapping, which restores creative
self-canonicals, discovery URLs and sitemap inclusion together; RSS GUIDs and
local reading/PDF routes remain stable. Revert the creative change if a complete
rollback is needed. The work site needs no revert because its verified
self-canonical implementation is unchanged.

Release record: pending draft PR review and authorized deployment. Live creative
post-release HTTP/HTML acceptance is pending; no indexing submission is included.


## Validation of this candidate

Revalidated on 2026-09-30 after dependency access recovered, using Node
**22.23.3**, matching the CI runtime major version. The two canonical-specific
TypeScript errors found in the initial draft (the test assertion overload and
JSON-LD array inference in the verification script) are corrected.

- Strict TypeScript check passed: `node_modules/.bin/tsc --noEmit`
- Full site selection passed: **264 tests, zero failures or skips**, using
  `node --import tsx --test $(find app lib scripts -name '*.test.ts' -print | sort)`.
  This is the same file selection as `npm run test:site`; the direct Node runner
  avoids a cloud-only IPC permission error in the `tsx` CLI wrapper
- `npm run test:furry-history-board` passed: **19 tests in eight files**
- `npm run lint` passed with no errors and four existing `no-img-element`
  warnings in unrelated MFF and Cultural Weather Vane files
- `npm run build` passed, including the Vite prebuild, Next production compile,
  TypeScript validation and static route generation. A real local dependency
  copy replaced the shared symlink to satisfy Turbopack's filesystem-root rule;
  no repository dependency, lockfile or Next configuration change was needed
- `git diff --check` passed
- The installed Next 16.3.6 metadata, generated-metadata and sitemap documentation
  was read after installation recovered

Actual HTTP/HTML checks against that running Node 22 production build passed:

- All three creative articles returned 200 and emitted the exact preferred work
  URL in canonical, Open Graph and `BlogPosting` document identity
- Query-string requests, including an untrusted `canonical` query parameter,
  and percent-encoded slug requests emitted the same approved identity
- Each article still linked to its original local `/pdf` route
- The distinct `/projects/the-singularity-log/rabies-capitalism` control retained
  its creative self-canonical and creative sitemap entry
- Live creative sitemap omitted the three duplicate editions; `llms.txt` and RSS
  reading links used work URLs while RSS GUIDs stayed at their historical URLs
- `/latest` supplied the preferred discovery links; the legacy numeric
  `/projects/bunch/1` route still returned 308 to `/projects/bunch/bunch`

These checks establish local build and emitted-response correctness. They do
not replace the new Vercel candidate deployment check or production acceptance.
The initial draft's hosted preview failed before these corrections. Verify the
updated head for [PR #378](https://github.com/Arcadesys/arcadeprofile/pull/378)
and keep production post-release HTTP/HTML acceptance pending. GitHub Actions
currently fails before its job steps, so no remote CI pass is claimed.

With a running candidate deployment, the committed read-only check is:

```sh
npm exec tsx scripts/verify-post-canonicals.ts http://localhost:3000
```

It verifies destination self-canonicals, the distinct work case study, creative
canonical/OG/schema output, query and encoded requests, an unmapped article,
both sitemaps, RSS GUID/link parity, and `llms.txt`. It follows no redirects and
performs no indexing submissions. Work targets and the production creative
origin must be indexable. On a local or preview origin, it reports and permits
intentional noindex protections while checking metadata; that mode is explicitly
not production indexing acceptance. Before release, recheck public robots and
retained local PDF/legacy routes. The live work-target evidence above remains a
separate destination-first check; no production creative deployment is implied.
