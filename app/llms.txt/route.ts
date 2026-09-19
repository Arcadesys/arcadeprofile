import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts } from '@/lib/markdown-posts';
import { buildLlmsIndex } from '@/lib/llms';
import { SITE_URL } from '@/lib/site-url';

export const dynamic = 'force-static';

export function GET(): Response {
  const body = buildLlmsIndex(
    SITE_URL,
    loadMarkdownGroups(),
    selectPublicMarkdownPosts(loadMarkdownPosts()),
  );

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
