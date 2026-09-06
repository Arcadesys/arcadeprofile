import { Feed } from 'feed';
import { SITE_NAME } from '@/lib/site-brand';
import { buildPostUrl, buildPostUrlMap, getPublishedPostsForRss } from '@/lib/blog';
import { markdownToSafeHtml } from '@/lib/markdown-render';
import { SITE_URL } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [posts, urlMap] = await Promise.all([
    getPublishedPostsForRss(),
    buildPostUrlMap(),
  ]);

  const feed = new Feed({
    title: `${SITE_NAME} — Latest`,
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

  for (const post of posts) {
    const loc = urlMap.get(post.slug);
    if (!loc) continue;

    const postLink = `${SITE_URL}${buildPostUrl(loc.groupSlug, post.slug)}`;
    const authorName = post.author?.trim() || 'Austen Tucker';
    const htmlBody = markdownToSafeHtml(post.markdownBody);

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
