/**
 * Instagram posting via the Graph API (Instagram Business Account).
 *
 * Two-step container flow:
 *   1. POST /{ig-user-id}/media with image_url + caption  -> creation_id
 *   2. POST /{ig-user-id}/media_publish with creation_id  -> media id
 *
 * Instagram requires an image; text-only posts aren't supported. Caller must
 * pass a publicly reachable image URL.
 *
 * Credentials are loaded from the `social-credentials` Payload global. The
 * Page Token is shared with the Facebook tab.
 */

import { getInstagramCredentials } from './credentials';

export interface InstagramPostResult {
  id: string;
  url: string;
}

export async function isInstagramConfigured(): Promise<boolean> {
  return (await getInstagramCredentials()) !== null;
}

export async function postToInstagram(
  caption: string,
  imageUrl: string,
): Promise<InstagramPostResult> {
  const creds = await getInstagramCredentials();
  if (!creds) {
    throw new Error(
      'Instagram is not configured (set Business Account ID under Globals → Social Credentials, plus a Facebook Page Token)',
    );
  }
  if (!imageUrl) throw new Error('Instagram post requires an image URL');

  const containerParams = new URLSearchParams();
  containerParams.set('image_url', imageUrl);
  containerParams.set('caption', caption);
  containerParams.set('access_token', creds.pageToken);

  const containerRes = await fetch(
    `https://graph.facebook.com/${creds.graphVersion}/${creds.igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams.toString(),
    },
  );
  if (!containerRes.ok) {
    const body = await containerRes.text();
    throw new Error(`Instagram container creation failed (${containerRes.status}): ${body}`);
  }
  const container = (await containerRes.json()) as { id: string };

  const publishParams = new URLSearchParams();
  publishParams.set('creation_id', container.id);
  publishParams.set('access_token', creds.pageToken);

  const publishRes = await fetch(
    `https://graph.facebook.com/${creds.graphVersion}/${creds.igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams.toString(),
    },
  );
  if (!publishRes.ok) {
    const body = await publishRes.text();
    throw new Error(`Instagram publish failed (${publishRes.status}): ${body}`);
  }
  const published = (await publishRes.json()) as { id: string };

  // Resolve the permalink for the freshly published media. The Graph API
  // returns a numeric media id, not the shortcode used in /p/{shortcode}/
  // URLs, so there's no safe URL we can construct ourselves — leave it
  // empty if the permalink lookup fails.
  let url = '';
  try {
    const permalinkRes = await fetch(
      `https://graph.facebook.com/${creds.graphVersion}/${published.id}?fields=permalink&access_token=${encodeURIComponent(creds.pageToken)}`,
    );
    if (permalinkRes.ok) {
      const data = (await permalinkRes.json()) as { permalink?: string };
      if (data.permalink) url = data.permalink;
    }
  } catch {
    // Non-fatal — leave url empty.
  }

  return { id: published.id, url };
}
