import type { Payload } from 'payload';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  isPrimary: boolean;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
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

export function ensureToysNavItem(items: NavItem[]): NavItem[] {
  if (items.some((item) => item.href === TOYS_NAV_ITEM.href)) return items;

  const projectsIndex = items.findIndex((item) => item.href === '/projects');
  const insertAt = projectsIndex === -1 ? 0 : projectsIndex + 1;

  return [
    ...items.slice(0, insertAt),
    TOYS_NAV_ITEM,
    ...items.slice(insertAt),
  ];
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
