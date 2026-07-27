import type { Payload } from 'payload';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  isPrimary: boolean;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', isPrimary: false },
  { id: 'toys', label: 'Toys', href: '/toys', isPrimary: false },
  { id: 'bio', label: 'Bio', href: '/bio', isPrimary: false },
  { id: 'latest', label: 'Latest', href: '/latest', isPrimary: false },
  { id: 'subscribe', label: 'Subscribe', href: '/subscribe', isPrimary: false },
  { id: 'store', label: 'Store', href: '/store', isPrimary: true },
];

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

function insertAfter(items: NavItem[], afterHref: string, item: NavItem): NavItem[] {
  const afterIndex = items.findIndex((entry) => entry.href === afterHref);
  const insertAt = afterIndex === -1 ? 0 : afterIndex + 1;
  return [...items.slice(0, insertAt), item, ...items.slice(insertAt)];
}

export function ensureToysNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === TOYS_NAV_ITEM.href)) return items;
  const afterHref = items.some((item) => item.href === '/portfolio')
    ? '/portfolio'
    : '/projects';
  return insertAfter(items, afterHref, TOYS_NAV_ITEM);
}

export function ensurePortfolioNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === PORTFOLIO_NAV_ITEM.href)) return items;
  return insertAfter(items, '/projects', PORTFOLIO_NAV_ITEM);
}

export function ensureCoreNavItems(items: NavItem[]): NavItem[] {
  return ensureToysNavItem(ensurePortfolioNavItem(items));
}

type NavPayload = Pick<Payload, 'find'>;

export async function loadVisibleNavItems(payload: NavPayload): Promise<NavItem[]> {
  const result = await payload.find({
    collection: 'nav-items',
    where: { visible: { equals: true } },
    sort: 'order',
    depth: 0,
    pagination: false,
  });

  return result.docs.map((doc) => ({
    id: String(doc.id),
    label: doc.label,
    href: doc.href,
    isPrimary: Boolean(doc.isPrimary),
  }));
}
