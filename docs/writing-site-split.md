# Writing site / builder site split

Status: draft plan, Nov 16, 2026. Nothing here is live until Austen says yes.

## The idea

- `www.thearcades.me` is the writing site. Promise: "Strange fiction with heart. Everything here used to be something else."
- `work.thearcades.me` (repo `Arcadesys/work-thearcades-me`) is the builder site: résumé, case studies, demos, build logs.
- The writing site keeps one quiet door to the builder site: "Things I build" in the footer.

## Phase 1 (this PR, www only)

- Rail: Read, Blog, Books, About. Résumé and "Watch me build" are gone.
- Home: the promise as the h1, then "What to read next", then Estelle's Children, then the signup box, then This is what I do for fun.
- Home brand bar loses "Work with me". Bio and site search lose the résumé link.
- `/latest` is the Blog: every piece, newest first, with series chips.
- `/projects` (the old grid) redirects to `/latest` with a temporary 307. Series pages and every article URL stay.
- Footer "more": Portfolio, Toys, Things I build. Case Studies leaves the footer.
- Signup gift: Carl replaces Broomsticks everywhere except the Estelle's Children page.
  Carl's files are bracketed placeholders until Austen binds the PDF and ebook in Heinlein.
  While they are placeholders, the form says "Draft offer", no download links appear,
  and welcome email 1 refuses to send.
- Welcome email 1 now gives Carl. It stays behind `WELCOME_SERIES_ENABLED` (off).

Kept on purpose: `/welcome` (business-card QR page) and `/start` (chooser) still link to the work site and résumé.
They are hand-off pages for both personas. `/resume` keeps its permanent redirect to work.

## Phase 2 (next PRs, after Austen decides what counts as builder work)

Move to work.thearcades.me, then 308-redirect the old www URLs to their new homes:

| www URL | Recommendation |
| --- | --- |
| `/lab`, `/lab/*` (6 case studies) | Move to work |
| `/toys/cultural-weather-vane` | Move to work |
| `/heinlein`, `/reaction-stickers` demos | Move to work |
| `/toys/*` interactive stories (5) | Open question: they are fiction |
| `/toys/message-in-a-bottle` | Open question: work already has a campaign copy |
| Arcade Blog, Bunch series | Open question: canonical policy says www owns originals |

Order for each move: ship the page on work, check it is live, then add the www redirect.
Never redirect to a work URL that does not exist yet.

## Open choices for Austen

1. What counts as builder work (table above).
2. Site name: the brand still reads "ArcadeProfile / The Arcades' Lab", which sounds like the builder site.
3. Bio header still lists builder titles (AI enablement, program manager).
4. Carl gift: keep the public Carl page, or make the bound edition feel special.

## Before merging

- Austen supplies `public/lead-magnets/carl.pdf` and `carl.epub`, and the urls in
  `lib/subscriber-gift.ts` switch from placeholders to those paths.
- Austen reads the new home, footer and signup copy.
