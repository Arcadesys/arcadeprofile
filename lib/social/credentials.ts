import { getPayload } from 'payload';
import config from '@payload-config';

import type { SocialCredential } from '../../payload-types';

export interface BlueskyCredentials {
  handle: string;
  appPassword: string;
}

export interface FacebookCredentials {
  pageId: string;
  pageToken: string;
  graphVersion: string;
}

export interface InstagramCredentials {
  igUserId: string;
  pageToken: string;
  graphVersion: string;
}

export interface LinkedInCredentials {
  accessToken: string;
  authorUrn: string;
}

const DEFAULT_GRAPH_VERSION = 'v21.0';

// Dedupe concurrent reads (e.g. the parallel platform calls fired by
// `autoPostToSocial`) onto a single in-flight DB query. The cache is cleared
// once the promise settles so subsequent requests re-read fresh values.
let inFlight: Promise<SocialCredential> | null = null;

async function loadGlobal(): Promise<SocialCredential> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const payload = await getPayload({ config });
    return payload.findGlobal({
      slug: 'social-credentials',
      overrideAccess: true,
      depth: 0,
    });
  })().finally(() => {
    inFlight = null;
  }) as Promise<SocialCredential>;
  return inFlight;
}

function trimmed(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

export async function getBlueskyCredentials(): Promise<BlueskyCredentials | null> {
  const doc = await loadGlobal();
  const handle = trimmed(doc.bluesky?.handle);
  const appPassword = trimmed(doc.bluesky?.appPassword);
  if (!handle || !appPassword) return null;
  return { handle, appPassword };
}

export async function getFacebookCredentials(): Promise<FacebookCredentials | null> {
  const doc = await loadGlobal();
  const pageId = trimmed(doc.facebook?.pageId);
  const pageToken = trimmed(doc.facebook?.pageToken);
  if (!pageId || !pageToken) return null;
  return {
    pageId,
    pageToken,
    graphVersion: trimmed(doc.facebook?.graphVersion) ?? DEFAULT_GRAPH_VERSION,
  };
}

export async function getInstagramCredentials(): Promise<InstagramCredentials | null> {
  const doc = await loadGlobal();
  const igUserId = trimmed(doc.instagram?.businessAccountId);
  const pageToken = trimmed(doc.facebook?.pageToken);
  if (!igUserId || !pageToken) return null;
  return {
    igUserId,
    pageToken,
    graphVersion: trimmed(doc.facebook?.graphVersion) ?? DEFAULT_GRAPH_VERSION,
  };
}

export async function getLinkedInCredentials(): Promise<LinkedInCredentials | null> {
  const doc = await loadGlobal();
  const accessToken = trimmed(doc.linkedin?.accessToken);
  const authorUrn = trimmed(doc.linkedin?.authorUrn);
  if (!accessToken || !authorUrn) return null;
  return { accessToken, authorUrn };
}
