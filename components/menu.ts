export type MenuLink = {
  href: string;
  label: string;
  prefixMatch?: boolean;
  isPrimary?: boolean;
  external?: boolean;
};

export type FooterGroup = {
  title: string;
  links: { href: string; label: string }[];
};

export const mainMenuLinks: MenuLink[] = [
  { href: '/projects', label: 'Projects', prefixMatch: true },
  { href: '/resume', label: 'Resume' },
  { href: '/bio', label: 'Bio' },
  { href: '/blog', label: 'Blog', prefixMatch: true },
  { href: '/store', label: 'Store' },
];

export const footerGroups: FooterGroup[] = [
  {
    title: 'Writing',
    links: [
      { href: '/samples', label: 'Samples' },
      { href: '/writing', label: 'Writing hub' },
      { href: '/blog', label: 'Blog archive' },
    ],
  },
  {
    title: 'Projects',
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/demos', label: 'Demos' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/bio', label: 'About Austen' },
      { href: '/resume', label: 'Resume' },
      { href: '/did', label: 'DID' },
      { href: '/betareader', label: 'Beta reader form' },
    ],
  },
];

export const footerCta = {
  eyebrow: 'Start with a sample',
  heading: 'Read the work first.',
  body: 'Browse sample chapters and project excerpts, then subscribe or sign up as a beta reader if one catches.',
  href: '/samples',
  label: 'Browse samples',
};

export const projectCategoryLinks = [
  { href: '/projects?category=fiction', label: 'Fiction' },
  { href: '/projects?category=tools', label: 'Tools' },
  { href: '/projects?category=experiments', label: 'Experiments' },
  { href: '/projects?category=audio-video', label: 'Audio/Video' },
];

export const categoryLabels: Record<string, string> = {
  fiction: 'Fiction',
  tools: 'Tools',
  experiments: 'Experiments',
  'audio-video': 'Audio/Video',
  community: 'Community',
};
