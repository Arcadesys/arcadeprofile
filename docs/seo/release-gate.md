# SEO release gate (#294)

Two layers. The first runs on every PR; the second is a human release step.

## 1. Deterministic, on every PR (CI)

| Repo | Command | What it checks |
| --- | --- | --- |
| arcadeprofile | `npm run test:seo` (CI job `seo`, after build + `next start`) | Canonicals and og:url, distinct titles, descriptions, no noindex, absolute og:image, JSON-LD, sitemap origin and exclusions, robots, résumé 308s, 404 |
| work-thearcades-me | `npm run test:rendered` (CI job `rendered`, after build) | Canonicals, og:url, titles, card alt text, JSON-LD images, blog thumbnails, copies' cross-domain canonicals and sitemap exclusion, noindex pages |
| work-thearcades-me | `npm test` (CI job `checks`) | Metadata helpers, documented Article fields on every public article, canonical-map validation |

A red job blocks the PR. Fix the responsible change; never delete or skip the test.

## 2. Live audit, after each production deploy

```sh
npm run audit:live          # both production sites
CREATIVE_ORIGIN=… WORK_ORIGIN=… npm run audit:live   # a preview or local pair
```

GET-only, no redirects followed, no forms. `PASS`, `DEFECT` and `NETWORK` are
reported separately; only defects make it exit non-zero. Host redirects
(http→https, apex→www) are checked only in production mode. External platform
inspectors (LinkedIn, Slack, Search Console) stay manual and are recorded below.

## Evidence matrix (copy per release)

| Route / check | Assertion | Result | Commit | Environment | Timestamp (UTC) |
| --- | --- | --- | --- | --- | --- |
| `npm run audit:live` | 0 defects | | | production | |
| Search Console URL inspection (sample) | Google-selected canonical recorded | | | production | |
| Share preview (one post) | Correct title/image in platform inspector | | | production | |

Record preview and production separately. Merged is not the same as verified live.
