import { Feed } from 'feed';
import { getPublishedPostsForRss } from '@/lib/blog';
import { buildPostNewsletterContent } from '@/lib/newsletter';
import type { Post } from '@/payload-types';

export const dynamic = 'force-dynamic';

const DEFAULT_SITE_URL = 'https://thearcades.me';

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

export async function GET() {
  const SITE_URL = getSiteUrl();
  const posts = await getPublishedPostsForRss();

  const feed = new Feed({
    title: 'The Arcades - Blog',
    description: 'Blog posts by Austen Tucker',
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
    const postLink = `${SITE_URL}/blog/${post.slug}`;
    const authorName = post.author?.trim() || 'Austen Tucker';
    const { htmlBody } = buildPostNewsletterContent(
      post as unknown as Pick<Post, 'content' | 'excerpt' | 'slug' | 'title'>,
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
