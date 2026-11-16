import { ORIENTATION_NAV_ITEMS, type NavItem } from './nav-items';

/**
 * Destinations the home footer offers so a reader can leave the page without the rail.
 * Built from the rail's own items so labels and hrefs cannot drift; off-site items
 * (Resume) are left out because the home header already carries "Work with me".
 */
export function getHomeFooterNavItems(): NavItem[] {
  return ORIENTATION_NAV_ITEMS.filter((item) => item.href.startsWith('/'));
}
