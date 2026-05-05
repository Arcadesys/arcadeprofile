/**
 * LinkedIn posting via the UGC Posts API.
 *
 * Auth: an OAuth access token (member or organization) with `w_member_social`
 * (personal) or `w_organization_social` (org pages).
 *
 * Author URN forms:
 *   - Personal:    urn:li:person:{member-id}
 *   - Organization: urn:li:organization:{org-id}
 */

export interface LinkedInPostResult {
  id: string;
  url: string;
}

function getCredentials(): { accessToken: string; authorUrn: string } | null {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN;
  if (!accessToken || !authorUrn) return null;
  return { accessToken, authorUrn };
}

export function isLinkedInConfigured(): boolean {
  return getCredentials() !== null;
}

export async function postToLinkedIn(
  text: string,
  linkUrl?: string,
  linkTitle?: string,
  linkDescription?: string,
): Promise<LinkedInPostResult> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('LinkedIn is not configured (set LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN)');
  }

  const shareContent: Record<string, unknown> = {
    shareCommentary: { text },
    shareMediaCategory: linkUrl ? 'ARTICLE' : 'NONE',
  };
  if (linkUrl) {
    shareContent.media = [
      {
        status: 'READY',
        originalUrl: linkUrl,
        ...(linkTitle ? { title: { text: linkTitle } } : {}),
        ...(linkDescription ? { description: { text: linkDescription } } : {}),
      },
    ];
  }

  const body = {
    author: creds.authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${errBody}`);
  }

  // The post id is returned in the `x-restli-id` header (and the JSON body).
  const id =
    res.headers.get('x-restli-id') ||
    ((await res.json().catch(() => ({}))) as { id?: string }).id ||
    '';

  // Activity URN for the feed permalink: convert urn:li:share:XYZ → activity-XYZ.
  let url = 'https://www.linkedin.com/feed/';
  if (id) {
    const numeric = id.split(':').pop();
    url = `https://www.linkedin.com/feed/update/urn:li:activity:${numeric}/`;
  }

  return { id, url };
}
