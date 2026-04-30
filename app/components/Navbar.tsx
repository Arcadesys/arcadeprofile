import { getPayload } from 'payload';
import config from '@payload-config';
import NavbarClient, { type NavItem } from './NavbarClient';

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', href: '/projects', isPrimary: false },
  { id: 'bio',      label: 'Bio',      href: '/bio',      isPrimary: false },
  { id: 'resume',   label: 'Resume',   href: '/resume',   isPrimary: false },
  { id: 'blog',     label: 'Blog',     href: '/blog',     isPrimary: false },
  { id: 'store',    label: 'Store',    href: '/store',    isPrimary: true  },
];

export default async function Navbar() {
  let items: NavItem[] = DEFAULT_NAV_ITEMS;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'nav-items',
      where: { visible: { equals: true } },
      sort: 'order',
      limit: 20,
    });

    if (result.docs.length > 0) {
      items = result.docs.map((doc) => ({
        id:        String(doc.id),
        label:     doc.label,
        href:      doc.href,
        isPrimary: Boolean(doc.isPrimary),
      }));
    }
  } catch {
    // Fall back to defaults if Payload is unavailable (build time, etc.)
  }

  return <NavbarClient items={items} />;
}
