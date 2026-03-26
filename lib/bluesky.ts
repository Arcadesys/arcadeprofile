/**
 * Bluesky AT Protocol client for posting social content.
 * Uses the public AT Protocol API directly (no SDK dependency).
 */

const BLUESKY_PDS = 'https://bsky.social';

interface BlueskySession {
  did: string;
  accessJwt: string;
}

interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri?: string }>;
}

interface BlueskyEmbed {
  $type: string;
  external: {
    uri: string;
    title: string;
    description: string;
  };
}

export interface BlueskyPostResult {
  uri: string;
  cid: string;
}

function getCredentials(): { handle: string; appPassword: string } {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;
  if (!handle) throw new Error('Missing BLUESKY_HANDLE environment variable');
  if (!appPassword) throw new Error('Missing BLUESKY_APP_PASSWORD environment variable');
  return { handle, appPassword };
}

async function createSession(): Promise<BlueskySession> {
  const { handle, appPassword } = getCredentials();
  const res = await fetch(`${BLUESKY_PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky auth failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { did: data.did, accessJwt: data.accessJwt };
}

/** Detect URLs in text and build link facets with correct byte offsets. */
function detectLinkFacets(text: string): BlueskyFacet[] {
  const facets: BlueskyFacet[] = [];
  const urlRegex = /https?:\/\/[^\s)>\]]+/g;
  const encoder = new TextEncoder();
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const matchBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }
  return facets;
}

export async function createPost(
  text: string,
  linkUrl: string,
  linkTitle: string,
  linkDescription: string,
): Promise<BlueskyPostResult> {
  const session = await createSession();

  const facets = detectLinkFacets(text);

  const embed: BlueskyEmbed = {
    $type: 'app.bsky.embed.external',
    external: {
      uri: linkUrl,
      title: linkTitle,
      description: linkDescription,
    },
  };

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    facets,
    embed,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(`${BLUESKY_PDS}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky post failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { uri: data.uri, cid: data.cid };
}

/** Post arbitrary text; optional link URL adds an external embed (minimal metadata). */
export async function postToBluesky(text: string, linkUrl?: string): Promise<BlueskyPostResult> {
  const session = await createSession();
  const facets = detectLinkFacets(text);

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  };

  if (facets.length > 0) {
    record.facets = facets;
  }

  if (linkUrl) {
    record.embed = {
      $type: 'app.bsky.embed.external',
      external: { uri: linkUrl, title: '', description: '' },
    };
  }

  const res = await fetch(`${BLUESKY_PDS}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky post failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { uri: data.uri, cid: data.cid };
}

/** Convert AT URI to web URL */
export function atUriToWebUrl(uri: string): string {
  const parts = uri.replace('at://', '').split('/');
  if (parts.length >= 3) {
    return `https://bsky.app/profile/${parts[0]}/post/${parts[2]}`;
  }
  return uri;
}
