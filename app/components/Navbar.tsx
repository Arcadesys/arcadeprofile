import { getPayload } from 'payload';
import config from '@payload-config';
import { hasConfiguredDatabaseURL } from '@/lib/env';
import {
  DEFAULT_NAV_ITEMS,
  ensureToysNavItem,
  loadVisibleNavItems,
  type NavItem,
} from '@/lib/nav-items';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  let items: NavItem[] = DEFAULT_NAV_ITEMS;

  if (!hasConfiguredDatabaseURL()) {
    return <NavbarClient items={items} />;
  }

  try {
    const payload = await getPayload({ config });
    const cmsItems = await loadVisibleNavItems(payload);
    if (cmsItems.length > 0) items = ensureToysNavItem(cmsItems);
  } catch {
    // Fall back to defaults if Payload is unavailable (build time, etc.)
  }

  return <NavbarClient items={items} />;
}
