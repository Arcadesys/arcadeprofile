import { Feed } from 'feed';
import { buildPostUrl, buildPostUrlMap, getPublishedPostsForRss } from '@/lib/blog';
import { buildPostNewsletterContent } from '@/lib/newsletter';
import { getStaticEssays } from '@/lib/static-essays';

export const dynamic = 'force-dynamic';

const DEFAULT_SITE_URL = 'https://thearcades.me';

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

function markdownToAccessibleHtml(markdown: string): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return markdown.split(/\n\s*\n/).map(block => {
    const text = escape(block.trim());
    if (!text) return '';
    if (text.startsWith('## ')) return `<h2>${text.slice(3)}</h2>`;
    if (text.startsWith('# ')) return `<h1>${text.slice(2)}</h1>`;
    if (text.startsWith('> ')) return `<blockquote><p>${text.replace(/^> /gm, '').replace(/\n/g, '<br />')}</p></blockquote>`;
    return `<p>${text.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');
}

export async function GET() {
  const SITE_URL = getSiteUrl();
  const staticEssays = await getStaticEssays();
  const staticSlugs = new Set(staticEssays.map(essay => essay.slug));
  // Payload remains a fallback for non-promoted surfaces and unconverted
  // posts. A promoted Markdown essay is never replaced by its live CMS copy.
  const [payloadResult] = await Promise.allSettled([
    Promise.all([getPublishedPostsForRss(), buildPostUrlMap()]),
  ]);
  const [posts, urlMap] = payloadResult.status === 'fulfilled' ? payloadResult.value : [[], new Map()];

  const feed = new Feed({
    title: 'Free Play Publishing — Latest',
    description: 'Writing by Austen Tucker',
    id: SITE_URL,
    link: SITE_URL,
    language: 'en',
    copyright: `© 2006 Austen Tucker`,
    author: {
      name: 'Austen Tucker',
      link: SITE_URL,
    },
    feedLinks: {
      rss: `${SITE_URL}/feed.xml`,
    },
  });

  for (const essay of staticEssays) {
    const postLink = `${SITE_URL}${buildPostUrl(essay.group.slug, essay.slug)}`;
    feed.addItem({
      title: essay.title,
      id: postLink,
      link: postLink,
      description: essay.excerpt,
      content: markdownToAccessibleHtml(essay.body),
      date: new Date(essay.publishedDate),
      author: [{ name: essay.author?.trim() || 'Austen Tucker', link: SITE_URL }],
    });
  }

  for (const post of posts) {
    if (staticSlugs.has(post.slug)) continue;
    const loc = urlMap.get(post.slug);
    if (!loc) continue;

    const postLink = `${SITE_URL}${buildPostUrl(loc.groupSlug, post.slug)}`;
    const authorName = post.author?.trim() || 'Austen Tucker';
    const { htmlBody } = buildPostNewsletterContent(
      {
        content: post.content,
        excerpt: post.excerpt,
        slug: post.slug,
        title: post.title,
        group: { slug: loc.groupSlug },
      },
      SITE_URL,
    );

    feed.addItem({
      title: post.title,
      id: postLink,
      link: postLink,
      description: post.excerpt,
      content: htmlBody,
      date: new Date(post.date),
      author: [{ name: authorName, link: SITE_URL }],
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
