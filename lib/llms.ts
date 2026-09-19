import { buildGroupIntroUrl, buildPostUrl } from '@/lib/post-url';
import type { MarkdownGroup, MarkdownPost } from '@/lib/markdown-posts';

interface LlmsEntry {
  title: string;
  url: string;
  description?: string;
}

function entryLine({ title, url, description }: LlmsEntry): string {
  return `- [${title}](${url})${description ? `: ${description}` : ''}`;
}

export function buildLlmsIndex(
  siteUrl: string,
  groups: readonly MarkdownGroup[],
  posts: readonly MarkdownPost[],
): string {
  const canonicalSiteUrl = siteUrl.replace(/\/$/, '');
  const sections = [
    '# The Arcades',
    '',
    '> The personal site of Austen Tucker: essays, projects, fiction, and creative experiments.',
    '',
    'This index lists public canonical pages. It does not grant access to private, preview, or future-dated material.',
    '',
    '## Site guides',
    '',
    entryLine({ title: 'Home', url: canonicalSiteUrl }),
    entryLine({ title: 'Writing', url: `${canonicalSiteUrl}/writing`, description: 'Essays and serialized work.' }),
    entryLine({ title: 'Projects', url: `${canonicalSiteUrl}/projects`, description: 'Project collections and articles.' }),
    entryLine({ title: 'Portfolio', url: `${canonicalSiteUrl}/portfolio`, description: 'Independent fiction and creative work.' }),
    entryLine({ title: 'Sitemap', url: `${canonicalSiteUrl}/sitemap.xml`, description: 'Complete public URL inventory.' }),
    '',
    '## Public project collections',
    '',
    ...groups.map((group) => entryLine({
      title: group.title,
      url: `${canonicalSiteUrl}${buildGroupIntroUrl(group.slug)}`,
      description: group.description,
    })),
    '',
    '## Public articles',
    '',
    ...posts.map((post) => entryLine({
      title: post.title,
      url: `${canonicalSiteUrl}${buildPostUrl(post.group, post.slug)}`,
      description: post.excerpt,
    })),
    '',
  ];

  return sections.join('\n');
}
