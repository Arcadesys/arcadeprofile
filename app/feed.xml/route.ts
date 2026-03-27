import { Feed } from 'feed';
import { getAllPosts } from '@/lib/blog';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://thearcades.me';

export async function GET() {
  const posts = await getAllPosts();

  const feed = new Feed({
    title: 'The Arcades - Blog',
    description: 'Blog posts by Austen Tucker',
    id: SITE_URL,
    link: SITE_URL,
    language: 'en',
    copyright: `© ${new Date().getFullYear()} Austen Tucker`,
    author: {
      name: 'Austen Tucker',
      link: SITE_URL,
    },
  });

  for (const post of posts) {
    feed.addItem({
      title: post.title,
      id: `${SITE_URL}/blog/${post.slug}`,
      link: `${SITE_URL}/blog/${post.slug}`,
      description: post.excerpt,
      date: new Date(post.date),
      author: [{ name: 'Austen Tucker', link: SITE_URL }],
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
