# Resume domain cutover gate

## Current state

`https://www.thearcades.me/resume` remains the public, canonical resume while
`https://work.thearcades.me/resume` is being established. The homepage links to
the professional site through the visible **Work with me** banner, but no
resume route, PDF, sitemap entry, or navigation link has been removed here.

## Required evidence before removal

1. The work-domain owner confirms that `https://work.thearcades.me/resume` is
   the intended canonical replacement and is live.
2. A current browser check confirms the replacement renders at desktop and
   narrow mobile widths, has readable large-text controls, and is keyboard
   operable.
3. The work-domain resume download/contact paths work, if they are intended to
   replace this site's `/resume/pdf` and contact links.
4. A release owner approves the redirect and SEO plan for the old URL.

## Removal batch after the gate passes

- Replace remaining `/resume` and `/resume/pdf` calls to action with the work
  domain destination.
- Remove the resume navigation item, page, PDF route, OpenGraph image, shared
  resume data, and sitemap entry only after the redirect decision is applied.
- Verify the old URL's approved redirect, the new rendered resume, sitemap,
  keyboard navigation, and narrow-width layout in the deployed environment.

This is intentionally a separate release. The banner is a discovery change;
removing the current public resume without the replacement evidence would make
the professional path less reliable.
