/**
 * Facebook Page posting via Graph API.
 * Requires a Page Access Token with `pages_manage_posts` + `pages_read_engagement`.
 *
 * Credentials are loaded from the `social-credentials` Payload global.
 */

import { getFacebookCredentials } from './credentials';

export interface FacebookPostResult {
  id: string;
  url: string;
}

export async function isFacebookConfigured(): Promise<boolean> {
  return (await getFacebookCredentials()) !== null;
}

export async function postToFacebook(
  message: string,
  linkUrl?: string,
): Promise<FacebookPostResult> {
  const creds = await getFacebookCredentials();
  if (!creds) {
    throw new Error(
      'Facebook is not configured (set Page ID and Page Token under Globals → Social Credentials)',
    );
  }

  const params = new URLSearchParams();
  params.set('message', message);
  if (linkUrl) params.set('link', linkUrl);
  params.set('access_token', creds.pageToken);

  const res = await fetch(
    `https://graph.facebook.com/${creds.graphVersion}/${creds.pageId}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    },
  );

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
