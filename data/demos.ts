export interface DemoInfo {
  slug: string;
  title: string;
  description: string;
  image?: string;
  /** URL to embed in an iframe, or a path to a local HTML file in public/demos/ */
  embedUrl: string;
  tags?: string[];
}

export const demos: DemoInfo[] = [
  // Add demos here. Example:
  // {
  //   slug: 'magic-mirror',
  //   title: 'Magic Mirror Demo',
  //   description: 'Try the AI photobooth transformation tool.',
  //   embedUrl: 'https://magic-mirror.example.com',
  //   tags: ['AI', 'Interactive'],
  // },
];

export function getDemoBySlug(slug: string): DemoInfo | undefined {
  return demos.find((d) => d.slug === slug);
}
