/**
 * Instagram posting via the Graph API (Instagram Business Account).
 *
 * Two-step container flow:
 *   1. POST /{ig-user-id}/media with image_url + caption  -> creation_id
 *   2. POST /{ig-user-id}/media_publish with creation_id  -> media id
 *
 * Instagram requires an image; text-only posts aren't supported. Caller must
 * pass a publicly reachable image URL.
 */

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v21.0';

export interface InstagramPostResult {
  id: string;
  url: string;
}

function getCredentials(): { igUserId: string; pageToken: string } | null {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN;
  if (!igUserId || !pageToken) return null;
  return { igUserId, pageToken };
}

export function isInstagramConfigured(): boolean {
  return getCredentials() !== null;
}

export async function postToInstagram(
  caption: string,
  imageUrl: string,
): Promise<InstagramPostResult> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Instagram is not configured (set INSTAGRAM_BUSINESS_ACCOUNT_ID and FACEBOOK_PAGE_TOKEN)');
  }
  if (!imageUrl) throw new Error('Instagram post requires an image URL');

  const containerParams = new URLSearchParams();
  containerParams.set('image_url', imageUrl);
  containerParams.set('caption', caption);
  containerParams.set('access_token', creds.pageToken);

  const containerRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${creds.igUserId}/media`,
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
    `https://graph.facebook.com/${GRAPH_VERSION}/${creds.igUserId}/media_publish`,
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

  // Resolve the permalink for the freshly published media.
  let url = `https://www.instagram.com/p/${published.id}/`;
  try {
    const permalinkRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${published.id}?fields=permalink&access_token=${encodeURIComponent(creds.pageToken)}`,
    );
    if (permalinkRes.ok) {
      const data = (await permalinkRes.json()) as { permalink?: string };
      if (data.permalink) url = data.permalink;
    }
  } catch {
    // Non-fatal — fall back to the id-based URL.
  }

  return { id: published.id, url };
}
