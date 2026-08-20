# The Arcades Lab ratchet

## Win condition

The public Lab index presents exactly WizWor, ToonTok, ArcadeProfile, and Conductor as readable, accessible product case studies, with any external destination placed only after the story and an honest AI-cost disclosure where relevant.

## Current best — 2026-08-20

- `/lab` lists WizWor, ToonTok, ArcadeProfile, and Conductor in that order. It does not include Toys.
- Each product has a semantic case-study page covering what was built, what was learned, limits, and open questions.
- WizWor and ToonTok disclose paid-model or credit use at the final external-link boundary.
- ArcadeProfile is framed as the public publishing and product platform, without unsupported audience or business claims.
- Conductor is framed as local Lab Infrastructure, not a hosted production platform, and points only to its public repository after the story.
- Existing image assets were inventoried. None is an honest product-interface screenshot, so labeled fallbacks remain in place.
- Public signup surfaces use the authoritative ActiveCampaign Form 7 Simple Embed. The wrapper makes the account-owned form readable and operable at large text sizes without copying generated submission tokens into source.
- Form 7 defaults to All, keeps All exclusive with Fiction and Essays, allows Arcades Lab & build logs independently, and accepts optional source/magnet hidden-field IDs only when the account provides them.

## Verification

- `npx tsc --noEmit` — pass.
- `npm test` — pass, 319 tests.
- `npm run lint` — pass.
- `npm run check:migrations -- 4426de4a2fc9fb0193edfdaa5fd25f6dc8f13745` — pass.
- `npm run build` with the existing root checkout environment — pass; all five Lab routes and `/subscribe/thanks` were emitted.
- Browser check at 1280×720 and 390×844 — pass for `/subscribe`, `/bio`, `/store`, `/subscribe/thanks?magnet=story`, the footer form, and all five Lab routes: one Form 7 per page, 18px form text, 28px checkboxes, 56px email/submit controls, 4px focus, no horizontal overflow, and Lab external links only after Explore.
- Local `/projects` and `/latest` browser checks remain blocked by the existing database missing `groups.serial_release_schedule_enabled`; the production build uses the site's existing static-sitemap fallback and succeeds.
- Protected preview: `https://arcadeprofile-6xjt4tjyw-austen-tuckers-projects.vercel.app` was built and accessed through Vercel's deployment-protection flow for `/lab`, `/lab/conductor`, `/subscribe`, and `/subscribe/thanks?magnet=story`.
- No production deployment, ActiveCampaign account mutation, or real contact submission was made.

## Screenshot asset gaps

- WizWor: a 1600×1000 capture of the live terminal after grounded recommendations appear, with no account or private data.
- ToonTok: a 1600×1000 capture of the public showroom or a permission-safe Vault or Light Table, with no private character or account data.
- ArcadeProfile: a 1600×1000 capture of a public reading or projects page showing navigation and reading controls, with no admin or subscriber data.
- Conductor: a 1600×1000 capture of the local Board using demo data, with one Story in review and its approval or receipt evidence visible; no real repository path, private issue, token, or provider data.
