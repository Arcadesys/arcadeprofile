export type NavItem = {
  id: string;
  label: string;
  href: string;
  isPrimary: boolean;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'writing', label: 'Read', href: '/writing', isPrimary: false },
  { id: 'projects', label: 'Watch me build', href: '/projects', isPrimary: false },
  { id: 'about', label: 'About', href: '/bio', isPrimary: false },
  { id: 'store', label: 'Store', href: '/store', isPrimary: false },
  { id: 'subscribe', label: 'Subscribe', href: '/subscribe', isPrimary: true },
  { id: 'stories', label: 'Stories', href: '/stories', isPrimary: false },
  { id: 'essays', label: 'Essays', href: '/essays', isPrimary: false },
  { id: 'lab', label: 'Case Studies', href: '/lab', isPrimary: false },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', isPrimary: false },
  { id: 'this-is-what-i-do-for-fun', label: 'Collection', href: '/this-is-what-i-do-for-fun', isPrimary: false },
  { id: 'toys', label: 'Toys', href: '/toys', isPrimary: false },
  { id: 'latest', label: 'Latest', href: '/latest', isPrimary: false },
];

export const ORIENTATION_NAV_ITEMS: readonly NavItem[] = [
  { id: 'writing', label: 'Read', href: '/writing', isPrimary: false },
  { id: 'projects', label: 'Watch me build', href: '/projects', isPrimary: false },
  { id: 'about', label: 'About', href: '/bio', isPrimary: false },
  { id: 'store', label: 'Store', href: '/store', isPrimary: false },
  { id: 'subscribe', label: 'Subscribe', href: '/subscribe', isPrimary: true },
];

const PRIMARY_NAV_HREFS = ORIENTATION_NAV_ITEMS.map((item) => item.href);

export interface NavigationModel {
  primary: NavItem[];
  more: NavItem[];
}

export const TOYS_NAV_ITEM: NavItem = {
  id: 'toys',
  label: 'Toys',
  href: '/toys',
  isPrimary: false,
};

export const PORTFOLIO_NAV_ITEM: NavItem = {
  id: 'portfolio',
  label: 'Portfolio',
  href: '/portfolio',
  isPrimary: false,
};

export const LAB_NAV_ITEM: NavItem = {
  id: 'lab',
  label: 'Case Studies',
  href: '/lab',
  isPrimary: false,
};

function insertAfter(items: NavItem[], afterHref: string, item: NavItem): NavItem[] {
  const afterIndex = items.findIndex((entry) => entry.href === afterHref);
  const insertAt = afterIndex === -1 ? 0 : afterIndex + 1;
  return [...items.slice(0, insertAt), item, ...items.slice(insertAt)];
}

export function ensureToysNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === TOYS_NAV_ITEM.href)) return items;
  const afterHref = items.some((item) => item.href === '/this-is-what-i-do-for-fun')
    ? '/this-is-what-i-do-for-fun'
    : items.some((item) => item.href === '/lab')
      ? '/lab'
      : items.some((item) => item.href === '/portfolio')
        ? '/portfolio'
        : '/projects';
  return insertAfter(items, afterHref, TOYS_NAV_ITEM);
}

export function ensurePortfolioNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === PORTFOLIO_NAV_ITEM.href)) return items;
  return insertAfter(items, '/projects', PORTFOLIO_NAV_ITEM);
}

export function ensureLabNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === LAB_NAV_ITEM.href)) return items;
  const afterHref = items.some((item) => item.href === '/portfolio')
    ? '/portfolio'
    : '/projects';
  return insertAfter(items, afterHref, LAB_NAV_ITEM);
}

export const COLLECTION_NAV_ITEM: NavItem = {
  id: 'this-is-what-i-do-for-fun',
  label: 'Collection',
  href: '/this-is-what-i-do-for-fun',
  isPrimary: false,
};

export function ensureCollectionNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === COLLECTION_NAV_ITEM.href)) return items;
  const afterHref = items.some((item) => item.href === '/lab')
    ? '/lab'
    : items.some((item) => item.href === '/portfolio')
      ? '/portfolio'
      : '/projects';
  return insertAfter(items, afterHref, COLLECTION_NAV_ITEM);
}

export const STORIES_NAV_ITEM: NavItem = {
  id: 'stories',
  label: 'Stories',
  href: '/stories',
  isPrimary: false,
};

export const ESSAYS_NAV_ITEM: NavItem = {
  id: 'essays',
  label: 'Essays',
  href: '/essays',
  isPrimary: false,
};

export const ABOUT_NAV_ITEM: NavItem = {
  id: 'about',
  label: 'About',
  href: '/bio',
  isPrimary: false,
};

export const SUBSCRIBE_NAV_ITEM: NavItem = {
  id: 'subscribe',
  label: 'Subscribe',
  href: '/subscribe',
  isPrimary: true,
};

function ensureNavItem(items: NavItem[], item: NavItem): NavItem[] {
  return items.some((entry) => entry.href === item.href) ? items : [...items, item];
}

/** Split the crowded historical navigation into editorial essentials and More. */
export function buildNavigationModel(items: readonly NavItem[]): NavigationModel {
  const primary: NavItem[] = [];
  const more: NavItem[] = [];

  for (const item of ORIENTATION_NAV_ITEMS) primary.push(item);
  for (const item of items) {
    if (!PRIMARY_NAV_HREFS.includes(item.href)) more.push(item);
  }
  return { primary, more };
}

// Keep every source-controlled destination available in the site navigation.
export function ensureCoreNavItems(items: NavItem[]): NavItem[] {
  return ensureNavItem(
    ensureNavItem(
      ensureNavItem(
        ensureNavItem(
          ensureNavItem(
            ensureToysNavItem(
              ensureCollectionNavItem(ensureLabNavItem(ensurePortfolioNavItem(items))),
            ),
            STORIES_NAV_ITEM,
          ),
          ESSAYS_NAV_ITEM,
        ),
        ABOUT_NAV_ITEM,
      ),
      SUBSCRIBE_NAV_ITEM,
    ),
    STORIES_NAV_ITEM,
  );
}
