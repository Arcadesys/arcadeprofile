/**
 * Which rail destination is lit for a path.
 *
 * Essays and fiction live under /projects/<series>/<piece>, so a plain prefix
 * match lights "Watch me build" while the breadcrumb says Read. The rail's
 * Read item owns every reading route; build projects keep Watch me build.
 */

/** Routes that belong to Read, apart from the project series the site tells us about. */
const READ_ROUTES = [
  '/writing',
  '/stories',
  '/essays',
  '/queercolumns',
  '/bibliography',
  '/novels',
  '/this-is-what-i-do-for-fun',
] as const;

/** Project categories whose series are essays and fiction, not builds. */
const READ_CATEGORIES: ReadonlySet<string> = new Set(['fiction', 'writing']);

/** The rail's Read destination. */
export const READ_HREF = '/writing';

const underPath = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Slugs of the project series that are read, not built. */
export function readProjectSlugs(projects: readonly { slug: string; category?: string | null }[]): string[] {
  return projects.filter((project) => project.category && READ_CATEGORIES.has(project.category)).map((project) => project.slug);
}

export function isReadPath(pathname: string, readSlugs: readonly string[]): boolean {
  if (READ_ROUTES.some((route) => underPath(pathname, route))) return true;
  return readSlugs.some((slug) => underPath(pathname, `/projects/${slug}`));
}

export function isNavItemActive(href: string, pathname: string, readSlugs: readonly string[]): boolean {
  if (href === '/') return pathname === '/';
  if (href === READ_HREF) return isReadPath(pathname, readSlugs);
  // A reading route is lit under Read only, even when its path also starts with another item's href.
  if (isReadPath(pathname, readSlugs)) return false;
  return underPath(pathname, href);
}
