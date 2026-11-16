# Broomsticks reading edition

Build locally with the [Heinlein](https://github.com/Arcadesys/heinlein) publishing
pipeline, Pandoc and Chrome installed:

```sh
node scripts/generate-broomsticks.mjs --debug-dir /tmp/broomsticks-proof
/path/to/heinlein/python scripts/validate-broomsticks.py
```

The Node entry point uses the Python interpreter from the installed `heinlein`
CLI; pass `--python /path/to/python` if it uses an indirect launcher. Validation
uses Poppler (`pdftotext`), Heinlein's `pypdf`, and installed site dependencies.
`--epub-only` leaves the PDF untouched. `--debug-dir` retains Heinlein's rendered
print HTML locally for inspection. Outputs stay unlisted under
`public/lead-magnets`; the script never sends, uploads or writes to the archive.

`estelles-children-layout.yaml` is a byte-identical snapshot of the original
`published/Estelle's Children — final assets/heinlein.yaml` in the private writing
archive. Austen explicitly selected that layout on 2026-10-20, rather than either
later interior proof option. Its SHA-256 is
`2154755f3cdab939dbd4c2988805fab3dd7da17b07f57edb4746dd261fb484ad`.
Keep the original `insert-coin` preset, 6×9 trade geometry, 0.85in top and 0.7in
side margins, and Heinlein's Lora/Inter/JetBrains Mono templates. Only the gift's
title, subtitle, imprint metadata, source/cover/output paths and separate edition
end matter are adapted. The novel's full cover and full manuscript are not
included. Free Play Publishing is the gift imprint specified by Austen.

The exact FINAL story slice is `broomsticks.md`, SHA-256
`a120180eb693201efa511abad57637036e0562393955a6bdad9764164ff02b92`.
The build checks both checksums and never edits these inputs. Its process-local
Heinlein adapter disables Pandoc `smart` punctuation for print and EPUB; the
upstream version has no project option for that. No Heinlein installation files
are changed. Build and validation fail on changed inputs or story text.

The EPUB follows Heinlein's edition H1 `#broomsticks` and manuscript H2
`#broomsticks-1`; both IDs are allocated by Pandoc in one Markdown document.
The nested story TOC/NCX entry must reach the H2, while the outer entry reaches
the edition title. The regression checks ID uniqueness, exact navigation targets,
every internal reference, and all story text and punctuation. PDF validation
compares extractable story text with only whitespace and automatic line-break
hyphenation normalized, checks 6×9 geometry, page bounds and the site annotation.
Also render and inspect cover, opening, body, story ending and end matter.

The recorded 2026-10-20 build uses Heinlein `9f3590c8`'s original templates.
Chrome's PDF embeds Lora, Inter and JetBrains Mono; the reflowable EPUB requests
those families with fallbacks. The existing template requests Google Fonts when
printing. Binary timestamps/font downloads can vary, so source and story parity
checks are required after rebuilding. No formal EPUBCheck certification is
claimed when that tool is unavailable.
