# Resume domain cutover gate

## Decision (2026-10-03)

The owner (Austen) approved the cutover in issue #287: `https://work.thearcades.me/resume`
is the canonical résumé, and the creative-site résumé routes redirect to it.
Role-specific editions and the full CV (work-site issues #47–#54) are published on
the work site and relate to that canonical résumé there; this site links only to
the canonical résumé.

## Gate evidence (all passed 2026-10-03)

1. **Destination live and canonical.** `https://work.thearcades.me/resume` returned
   200 HTML with `<link rel="canonical" href="https://work.thearcades.me/resume">`,
   title "Résumé — Austen Tucker-Crowder", no robots restriction, and a `mailto:`
   contact link.
2. **Browser check** (Playwright + axe on a production build of work `main`):
   desktop 1280px, 320px, and 320px with 200% root text. Each had no horizontal
   overflow, keyboard Tab reached the PDF download with a visible focus indicator,
   and axe reported zero WCAG 2 A/AA violations.
3. **Download path.** `https://work.thearcades.me/resume.pdf` returned 200
   `application/pdf`, `content-disposition: inline; filename="resume.pdf"`, a
   2-page document titled "Resume - Austen Tucker-Crowder" with contact links.
4. **Release approval.** Owner approval in #287 (2026-10-03).

## URL map

| Old URL | Treatment | New URL |
| --- | --- | --- |
| `/resume` | 308 permanent redirect, query string kept | `https://work.thearcades.me/resume` |
| `/resume/pdf` | 308 permanent redirect (PDF to PDF) | `https://work.thearcades.me/resume.pdf` |
| `/resume/` | Next's trailing-slash 308 to `/resume`, then the redirect above | same |
| `/resume/opengraph-image` | Not linked externally; unreachable after page removal | none |

Redirects live in `next.config.mjs`. Navigation (rail and fallback), footer,
homepage work lane, bio and site search link directly to the work URLs through
`lib/work-resume.ts`. The `/resume` sitemap entry and analytics path are removed.

## Remaining removal batch (after production verification)

The page, PDF route, OpenGraph image, CSS module and `lib/resume.ts` data stay in
the repository, unreachable behind the redirects, until the redirects are
verified in production. Then remove them in a separate change together with the
résumé funnel tests that read them.

## Rollback

Revert the cutover commit. That restores the local routes, links and sitemap
entry together; the retained page and PDF code means nothing needs rebuilding.
Permanent redirects can be cached by browsers, so a rollback also needs the old
links to be served for a while before external caches recover.

## Release record

- Cutover PR: #394, merged as `bb6493d` on 2026-10-03
- Production deployment: `dpl_2g4R2cKRbEaNmRhVKkw3w1sQRJDS`, aliased to
  `www.thearcades.me` and `thearcades.me`
- Production verification (2026-10-03 ~17:23 UTC): `https://www.thearcades.me/resume`
  returned 308 with `location: https://work.thearcades.me/resume`;
  `https://www.thearcades.me/resume/pdf` returned 308 with
  `location: https://work.thearcades.me/resume.pdf`. The destination PDF had
  already been verified as 200 `application/pdf`.
- Next: the removal batch above can proceed in its own change.
