import { buildPostUrl } from './post-url';
import { SITE_URL } from './site-url';

export const POST_CANONICAL_MAP_VERSION = '2026-09-30.1';
export const WORK_SITE_URL = 'https://work.thearcades.me';

export type PostCanonicalEdition = Readonly<{
  creativePath: string;
  canonicalUrl: string;
}>;

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const CREATIVE_POST_PATH = new RegExp(`^/projects/${SLUG}/${SLUG}$`);
const WORK_POST_PATH = new RegExp(`^/blog/${SLUG}$`);

/** Fail closed on invalid versioned configuration, never guess a destination. */
export function validatePostCanonicalEditions(
  editions: readonly PostCanonicalEdition[],
): readonly PostCanonicalEdition[] {
  const sources = new Set<string>();
  const targets = new Set<string>();
  return Object.freeze(editions.map(({ creativePath, canonicalUrl }) => {
    if (typeof creativePath !== 'string' || !CREATIVE_POST_PATH.test(creativePath)) {
      throw new TypeError('Canonical source must be an exact creative article path');
    }
    let target: URL;
    try {
      target = new URL(canonicalUrl);
    } catch {
      throw new TypeError(`Missing or invalid canonical target for ${creativePath}`);
    }
    if (target.origin !== WORK_SITE_URL || target.href !== canonicalUrl
      || target.username || target.password || target.search || target.hash
      || !WORK_POST_PATH.test(target.pathname)) {
      throw new TypeError(`Canonical target must be an exact HTTPS work article URL for ${creativePath}`);
    }
    if (sources.has(creativePath) || targets.has(canonicalUrl)) {
      throw new TypeError('Canonical mappings must have unique source and target articles');
    }
    sources.add(creativePath);
    targets.add(canonicalUrl);
    return Object.freeze({ creativePath, canonicalUrl });
  }));
}

/** Verified public, indexable duplicates only. Evidence: docs/seo/canonical-policy.md. */
export const POST_CANONICAL_EDITIONS = validatePostCanonicalEditions([
  {
    creativePath: '/projects/bunch/bunch',
    canonicalUrl: 'https://work.thearcades.me/blog/bunch',
  },
  {
    creativePath: '/projects/arcade-blog/four-stages-nobody-tells-you-about',
    canonicalUrl: 'https://work.thearcades.me/blog/four-stages-nobody-tells-you-about',
  },
  {
    creativePath: '/projects/the-singularity-log/claude-design-and-the-novel-t',
    canonicalUrl: 'https://work.thearcades.me/blog/claude-design-and-the-novel-t',
  },
]);

const canonicalByPath = new Map(POST_CANONICAL_EDITIONS.map((edition) => [edition.creativePath, edition.canonicalUrl]));

/** Only known creative paths are mapped; query/fragment suffixes are not identity. */
export function mappedPostCanonicalUrl(href: string): string | undefined {
  // Do not let URL parsing turn dot segments, encoded slashes or foreign origins
  // into an approved source. Public Markdown slugs are already strict kebab-case.
  const path = href.startsWith(`${SITE_URL}/`) ? href.slice(SITE_URL.length) : href;
  const pathname = path.split(/[?#]/, 1)[0];
  if (!CREATIVE_POST_PATH.test(pathname)) return undefined;
  return canonicalByPath.get(pathname);
}

/** Definitive reading links can leave this imprint; local route IDs must not. */
export function canonicalDiscoveryHref(href: string): string {
  return mappedPostCanonicalUrl(href) ?? href;
}

export function buildPostDiscoveryUrl(groupSlug: string, postSlug: string): string {
  return canonicalDiscoveryHref(buildPostUrl(groupSlug, postSlug));
}

export function buildPostCanonicalUrl(groupSlug: string, postSlug: string, siteUrl = SITE_URL): string {
  const localPath = buildPostUrl(groupSlug, postSlug);
  return mappedPostCanonicalUrl(localPath) ?? new URL(localPath, siteUrl).href;
}
