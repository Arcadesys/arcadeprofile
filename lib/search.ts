import { getAllGroups, getAllPosts, buildGroupIntroUrl, buildPostUrl } from '@/lib/blog';
import { PORTFOLIO_WORKS } from '@/lib/portfolio';

export type SearchItem = {
  title: string;
  href: string;
  kind: 'Page' | 'Series' | 'Essay' | 'Story';
  preview: string;
  searchText: string;
};

const PAGES: SearchItem[] = [
  { title: 'Read', href: '/writing', kind: 'Page', preview: 'Stories, essays, collections, and places to begin reading.', searchText: 'read writing stories essays collections' },
  { title: 'Watch me build', href: '/projects', kind: 'Page', preview: 'Experiments, software, creative tools, and ongoing projects.', searchText: 'projects software experiments build tools' },
  { title: 'Resume', href: '/resume', kind: 'Page', preview: 'Austen Tucker’s professional experience, skills, and selected work.', searchText: 'resume work experience skills career Austen Tucker' },
  { title: 'About', href: '/bio', kind: 'Page', preview: 'About Austen, the Arcades, and the work made here.', searchText: 'about bio Austen Arcades' },
  { title: 'Store', href: '/store', kind: 'Page', preview: 'Books and other things you can take home.', searchText: 'store books buy shop' },
  { title: 'Case Studies', href: '/lab', kind: 'Page', preview: 'AI engineering and product case studies from the lab.', searchText: 'case studies lab AI engineering product' },
  { title: 'Portfolio', href: '/portfolio', kind: 'Page', preview: 'Selected fiction and long-form creative work.', searchText: 'portfolio fiction stories creative writing' },
  { title: 'Toys', href: '/toys', kind: 'Page', preview: 'Small interactive browser toys and playful experiments.', searchText: 'toys games interactive browser experiments' },
];

function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function preview(excerpt: string, body: string): string {
  const text = plainText(excerpt || body);
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [posts, groups] = await Promise.all([getAllPosts(), getAllGroups()]);
  const groupTitles = new Map(groups.map((group) => [group.slug, group.title]));

  const series: SearchItem[] = groups.map((group) => ({
    title: group.title,
    href: buildGroupIntroUrl(group.slug),
    kind: 'Series',
    preview: group.description || `A ${group.posts.length}-part series.`,
    searchText: [group.title, group.description, ...(group.tags ?? [])].filter(Boolean).join(' '),
  }));

  const essays: SearchItem[] = posts.map((post) => ({
    title: post.title,
    href: buildPostUrl(post.group, post.slug),
    kind: 'Essay',
    preview: preview(post.excerpt, post.markdownBody),
    searchText: [post.title, post.excerpt, groupTitles.get(post.group), ...post.tags, plainText(post.markdownBody)].filter(Boolean).join(' '),
  }));

  const stories: SearchItem[] = PORTFOLIO_WORKS.map((work) => ({
    title: work.title,
    href: `/portfolio/${work.slug}`,
    kind: 'Story',
    preview: preview(work.excerpt, work.markdownBody),
    searchText: [work.title, work.excerpt, plainText(work.markdownBody)].join(' '),
  }));

  return [...PAGES, ...series, ...essays, ...stories];
}
