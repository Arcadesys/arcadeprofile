import {
  DEFAULT_NAV_ITEMS,
  ensureCoreNavItems,
} from '@/lib/nav-items';
import { buildSearchIndex } from '@/lib/search';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const searchItems = await buildSearchIndex();
  return (
    <NavbarClient
      items={ensureCoreNavItems(DEFAULT_NAV_ITEMS)}
      searchItems={searchItems}
    />
  );
}
