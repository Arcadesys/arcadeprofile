# Blog Markdown Migration Ratchet

## Current best

Plain Markdown files will become the canonical blog source. Payload remains
unchanged while this foundation is built and verified.

Each post will live at `content/posts/<group>/<slug>.md` and use this strict
frontmatter contract:

```yaml
---
id: cold-boot
title: "Cold Boot"
slug: cold-boot
group: open-port
publishDate: "2026-08-20T09:00:00-05:00"
order: 1
updatedDate: "2026-08-20T09:00:00-05:00"
excerpt: "A short reader-facing description."
tags: [serial-fiction, open-port]
hero:
  src: /images/cold-boot.webp
  alt: "A meaningful text alternative for the hero image."
seo:
  title: "Cold Boot | The Arcades"
  description: "A concise search and social description."
---
```

Required: `id`, `title`, `slug`, `group`, and `publishDate`.

Optional: `order`, `updatedDate`, `excerpt`, `tags`, `hero`, and `seo`.

The parser rejects unknown fields. In particular, there is no `status`,
`draft`, preview-token, reaction, or newsletter-delivery field.

## Visibility contract

`publishDate` is the only visibility control:

```text
publishDate <= current time  public
publishDate > current time   hidden
```

Future posts must return 404 from public article routes and remain absent from
RSS, sitemap, navigation, and related-post results. Branch/PR deployments are
the editorial preview surface; secret preview links are retired.

## Retired features

- Reader reactions are retired. Existing counts may be retained only in a
  migration record, not presented or migrated into a new runtime store.
- Secret preview links are retired.
- Checked-in RSS files are not part of the design. The eventual `/feed.xml`
  route must be generated from the same validated post index as public pages.

## Ratchet log

| Iteration | Verdict | Current best |
| --- | --- | --- |
| Foundation | Strict loader, deterministic ordering, injected-time public selector, and isolated fixtures added. | Keep: it introduces no public route or Payload behavior change. |
| Next | Export Payload posts and groups into the new contract, with parity reporting. | Pending. |
| Then | Move public routes, sitemap, and RSS to the same Markdown index. | Pending. |
