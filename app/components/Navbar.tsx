import {
  DEFAULT_NAV_ITEMS,
  ensureCoreNavItems,
} from '@/lib/nav-items';
import { readProjectSlugs } from '@/lib/nav-active';
import { getAllProjectHubs } from '@/lib/projects';
import { buildSearchIndex } from '@/lib/search';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const [searchItems, projects] = await Promise.all([buildSearchIndex(), getAllProjectHubs()]);
  return (
    <NavbarClient
      items={ensureCoreNavItems(DEFAULT_NAV_ITEMS)}
      searchItems={searchItems}
      readProjectSlugs={readProjectSlugs(projects)}
    />
  );
}
