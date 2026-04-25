export type MenuLink = {
  href: string;
  label: string;
  prefixMatch?: boolean;
  isPrimary?: boolean;
  external?: boolean;
  panel?: 'projects';
};

export const mainMenuLinks: MenuLink[] = [
  { href: '/', label: 'Start Here' },
  { href: '/previews', label: 'Previews', prefixMatch: true, isPrimary: true },
  { href: '/projects', label: 'Projects', prefixMatch: true, panel: 'projects' },
  { href: '/writing', label: 'Writing', prefixMatch: true },
  { href: '/about', label: 'About' },
];

export const projectCategoryLinks = [
  { href: '/projects?category=fiction', label: 'Fiction' },
  { href: '/projects?category=tools', label: 'Tools' },
  { href: '/projects?category=experiments', label: 'Experiments' },
  { href: '/projects?category=audio-video', label: 'Audio/Video' },
];
