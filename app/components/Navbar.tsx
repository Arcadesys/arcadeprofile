import {
  DEFAULT_NAV_ITEMS,
  ensureCoreNavItems,
} from '@/lib/nav-items';
import NavbarClient from './NavbarClient';

export default function Navbar() {
  return <NavbarClient items={ensureCoreNavItems(DEFAULT_NAV_ITEMS)} />;
}
