const ABSOLUTE_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Resolve a CMS canonical override to an absolute HTTP(S) URL.
 *
 * Root-relative and bare relative paths are resolved from the site root.
 * Invalid absolute URLs, non-HTTP(S) schemes, and protocol-relative URLs fall
 * back to the page's own URL.
 */
export function resolveCanonicalUrl(
  canonicalPath: string | null | undefined,
  fallbackPath: string,
  siteUrl: string,
): string {
  const site = parseHttpUrl(siteUrl);
  if (!site) {
    throw new TypeError('siteUrl must be an absolute HTTP(S) URL');
  }

  const fallback = new URL(
    fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`,
    site.origin,
  );
  fallback.hash = '';

  const candidate = canonicalPath?.trim();
  if (!candidate) return fallback.href;

  if (ABSOLUTE_SCHEME_RE.test(candidate)) {
    const absolute = parseHttpUrl(candidate);
    if (!absolute) return fallback.href;
    absolute.hash = '';
    return absolute.href;
  }

  // A protocol-relative URL can silently change origins, and backslashes are
  // treated as slashes by URL parsing. Neither is a valid CMS relative path.
  if (candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback.href;
  }

  const relative = new URL(candidate.startsWith('/') ? candidate : `/${candidate}`, site.origin);
  relative.hash = '';
  return relative.href;
}
