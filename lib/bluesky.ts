/**
 * Bluesky AT Protocol client for posting social content.
 * Uses the public AT Protocol API directly (no SDK dependency).
 */

const BSKY_SERVICE = 'https://bsky.social';

interface BlueskySession {
  did: string;
  accessJwt: string;
}

interface BlueskyPostResult {
  uri: string;
  cid: string;
}

interface RichTextFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri?: string; tag?: string }>;
}

function getCredentials() {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) {
    throw new Error('Missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD environment variables');
  }
  return { handle, password };
}

async function createSession(): Promise<BlueskySession> {
  const { handle, password } = getCredentials();
  const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky auth failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return { did: data.did, accessJwt: data.accessJwt };
}

/** Detect URLs in text and create link facets */
function detectFacets(text: string): RichTextFacet[] {
  const facets: RichTextFacet[] = [];
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const encoder = new TextEncoder();
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).length;
    const matchBytes = encoder.encode(match[0]).length;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }
  return facets;
}

export async function postToBluesky(text: string, linkUrl?: string): Promise<BlueskyPostResult> {
  const session = await createSession();
  const facets = detectFacets(text);

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  };

  if (facets.length > 0) {
    record.facets = facets;
  }

  // Add link card embed if URL provided
  if (linkUrl) {
    record.embed = {
      $type: 'app.bsky.embed.external',
      external: { uri: linkUrl, title: '', description: '' },
    };
  }

  const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
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
  // at://did:plc:xxx/app.bsky.feed.post/yyy -> https://bsky.app/profile/did:plc:xxx/post/yyy
  const parts = uri.replace('at://', '').split('/');
  if (parts.length >= 3) {
    return `https://bsky.app/profile/${parts[0]}/post/${parts[2]}`;
  }
  return uri;
}
