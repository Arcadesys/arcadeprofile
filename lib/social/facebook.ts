/**
 * Facebook Page posting via Graph API.
 * Requires a Page Access Token with `pages_manage_posts` + `pages_read_engagement`.
 */

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v21.0';

export interface FacebookPostResult {
  id: string;
  url: string;
}

function getCredentials(): { pageId: string; pageToken: string } | null {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN;
  if (!pageId || !pageToken) return null;
  return { pageId, pageToken };
}

export function isFacebookConfigured(): boolean {
  return getCredentials() !== null;
}

export async function postToFacebook(
  message: string,
  linkUrl?: string,
): Promise<FacebookPostResult> {
  const creds = getCredentials();
  if (!creds) throw new Error('Facebook is not configured (set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_TOKEN)');

  const params = new URLSearchParams();
  params.set('message', message);
  if (linkUrl) params.set('link', linkUrl);
  params.set('access_token', creds.pageToken);

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${creds.pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook post failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
  // Graph returns `${pageId}_${postId}`; the canonical URL is the post id half.
  const idParts = data.id.split('_');
  const postId = idParts[1] ?? data.id;
  return {
    id: data.id,
    url: `https://www.facebook.com/${creds.pageId}/posts/${postId}`,
  };
}
