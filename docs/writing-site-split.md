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

## Phase 2: builder work moves to work.thearcades.me

Austen chose to move all the toys, the interactive stories included.

| www URL | Where it goes |
| --- | --- |
| `/toys`, `/toys/*` (all 7 toys) | work, same path (Arcadesys/work-thearcades-me#119) |
| `/lab`, `/lab/<slug>` (6 case studies) | work, same path |
| `/lab/<slug>/pdf` | work case study page (the PDFs did not move) |
| `/heinlein`, `/reaction-stickers` demos | work, same path |
| `/reaction-stickers/publish.html` + Telegram API | stays on www (needs secrets and Telegram's registered callback) |
| `/lab/furry-history-board/app` | stays on www (its own Vite build) |
| Arcade Blog, Bunch series | stay on www for now: canonical policy says www owns originals |

The redirects in this PR are temporary (307). Switch them to permanent once the
move settles. The old toy and Lab source files stay in this repo until a cleanup
PR, so nothing is deleted yet.

Merge order: merge work #119 first and check the pages are live. Only then merge
this PR, so no redirect points at a page that does not exist yet.

## Open choices for Austen

1. Site name: the brand still reads "ArcadeProfile / The Arcades' Lab", which sounds like the builder site.
2. Bio header still lists builder titles (AI enablement, program manager).
3. Carl gift: keep the public Carl page, or make the bound edition feel special.

## Before merging

- Work #119 is merged and its pages are live.
- Austen supplies `public/lead-magnets/carl.pdf` and `carl.epub`, and the urls in
  `lib/subscriber-gift.ts` switch from placeholders to those paths.
- Austen reads the new home, footer and signup copy.

## Rebuilt on the top-bar redesign (#464)

This branch now sits on top of the top-bar redesign. The redesign's layout wins wherever the two overlapped:

- Top bar: kept as designed (Read, Blog, Watch me build, About, Books, and the "Work with me" button to the work site).
- Home: kept the hero, the three entry paths, Latest and the Zoo feature. Added the tagline ("Strange fiction with heart.") to the subhead, renamed Latest to Blog, and added the Carl gift signup after the latest posts.
- Removed from the writing site: the résumé links on Home and in the footer, the toy "continue" banner (toys now live on the work site), and the footer's Case Studies and Toys links. The footer has one "Things I build" link to the work site instead.
- "build notes" dropped from the Home subhead, since build writing belongs to the work site.
