/**
 * Cross-platform social posting on blog publish.
 *
 * Called from the Posts afterChange hook when a post first transitions into a
 * public state. Fans out to Bluesky, Facebook, Instagram, and LinkedIn,
 * recording one row per platform in the `social-posts` collection.
 *
 * Idempotency: skips any (slug, platform) pair that already has a `posted` or
 * `scheduled` social-posts row. Missing platform credentials skip silently
 * (no `failed` row) so platforms can be enabled incrementally.
 */

import type { Payload } from 'payload';

import type { Media, Post } from '../../payload-types';
import { atUriToWebUrl, isBlueskyConfigured, postToBluesky } from '../bluesky';
import { buildPostUrl, computePostPartIndex } from '../post-url';
import { isFacebookConfigured, postToFacebook } from './facebook';
import { isInstagramConfigured, postToInstagram } from './instagram';
import { isLinkedInConfigured, postToLinkedIn } from './linkedin';

export type SocialPlatform = 'bluesky' | 'facebook' | 'instagram' | 'linkedin';

export interface SocialFanoutResult {
  platform: SocialPlatform;
  status: 'posted' | 'failed' | 'skipped';
  reason?: string;
  postUrl?: string;
}

const ALL_PLATFORMS: SocialPlatform[] = ['bluesky', 'facebook', 'instagram', 'linkedin'];

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
}

function platformConfigured(platform: SocialPlatform): Promise<boolean> {
  switch (platform) {
    case 'bluesky':
      return isBlueskyConfigured();
    case 'facebook':
      return isFacebookConfigured();
    case 'instagram':
      return isInstagramConfigured();
    case 'linkedin':
      return isLinkedInConfigured();
  }
}

function resolveImageUrl(post: Post): string | undefined {
  const meta = post.meta as { image?: number | Media | null } | undefined;
  const image = meta?.image;
  if (!image || typeof image === 'number') return undefined;
  const url = (image as Media).url;
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${siteUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function resolveLinkUrl(payload: Payload, post: Post): Promise<string> {
  const slug = post.slug as string | undefined;
  const group = post.group as string | undefined;
  if (slug && group) {
    const partIndex = await computePostPartIndex(payload, slug, group);
    if (partIndex !== null) return `${siteUrl()}${buildPostUrl(group, partIndex)}`;
  }
  if (slug) return `${siteUrl()}/writing/${slug}`;
  return siteUrl();
}

function resolveSocialText(post: Post): string {
  const hook = (post as { discoverability?: { social_hook?: string | null } }).discoverability?.social_hook;
  if (hook && hook.trim()) return hook.trim();
  const excerpt = (post.excerpt as string | undefined)?.trim();
  if (excerpt) return `${post.title} — ${excerpt}`;
  return post.title as string;
}

async function dispatch(
  platform: SocialPlatform,
  args: { text: string; linkUrl: string; imageUrl?: string; title: string; description: string },
): Promise<{ uri?: string; url: string }> {
  switch (platform) {
    case 'bluesky': {
      const r = await postToBluesky(args.text, args.linkUrl);
      return { uri: r.uri, url: atUriToWebUrl(r.uri) };
    }
    case 'facebook': {
      const r = await postToFacebook(args.text, args.linkUrl);
      return { uri: r.id, url: r.url };
    }
    case 'instagram': {
      if (!args.imageUrl) {
        throw new Error('Instagram requires meta.image on the post');
      }
      // Instagram captions can't include clickable links, so append the URL as plain text.
      const caption = `${args.text}\n\n${args.linkUrl}`;
      const r = await postToInstagram(caption, args.imageUrl);
      return { uri: r.id, url: r.url };
    }
    case 'linkedin': {
      const r = await postToLinkedIn(args.text, args.linkUrl, args.title, args.description);
      return { uri: r.id, url: r.url };
    }
  }
}

export async function autoPostToSocial(
  payload: Payload,
  post: Post,
): Promise<SocialFanoutResult[]> {
  const slug = post.slug as string | undefined;
  if (!slug) {
    return ALL_PLATFORMS.map((p) => ({ platform: p, status: 'skipped', reason: 'missing slug' }));
  }

  const text = resolveSocialText(post);
  const linkUrl = await resolveLinkUrl(payload, post);
  const imageUrl = resolveImageUrl(post);
  const title = post.title as string;
  const description = (post.excerpt as string | undefined) || '';

  const runPlatform = async (platform: SocialPlatform): Promise<SocialFanoutResult> => {
    if (!(await platformConfigured(platform))) {
      return { platform, status: 'skipped', reason: 'not configured' };
    }

    // Idempotency: don't double-post for the same slug+platform.
    const existing = await payload.find({
      collection: 'social-posts',
      where: {
        and: [
          { slug: { equals: slug } },
          { platform: { equals: platform } },
          { status: { in: ['posted', 'scheduled'] } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      return { platform, status: 'skipped', reason: 'already posted or scheduled' };
    }

    try {
      const result = await dispatch(platform, { text, linkUrl, imageUrl, title, description });
      await payload.create({
        collection: 'social-posts',
        data: {
          platform,
          variant: 'custom',
          text,
          slug,
          linkUrl,
          status: 'posted',
          postedAt: new Date().toISOString(),
          postUri: result.uri,
          postUrl: result.url,
        },
        overrideAccess: true,
      });
      return { platform, status: 'posted', postUrl: result.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await payload.create({
        collection: 'social-posts',
        data: {
          platform,
          variant: 'custom',
          text,
          slug,
          linkUrl,
          status: 'failed',
          failedAt: new Date().toISOString(),
          failureReason: message,
        },
        overrideAccess: true,
      });
      return { platform, status: 'failed', reason: message };
    }
  };

  const settled = await Promise.allSettled(ALL_PLATFORMS.map(runPlatform));
  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          platform: ALL_PLATFORMS[i],
          status: 'failed' as const,
          reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
        },
  );
}
