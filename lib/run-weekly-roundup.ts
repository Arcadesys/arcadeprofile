/**
 * Weekly roundup orchestrator. Pulls posts published in the trailing 7 days,
 * splits them by stream (fiction vs essays via Group.category), renders one
 * digest per stream, and fans each out to the matching AC audience pair
 * ([fiction, all] / [essays, all]) using the existing per-post fan-out as
 * the transport — the slug is the only thing the underlying AC layer cares
 * about for naming, so we feed it a roundup identifier.
 */
import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import { computePostPartIndex } from './post-url';
import {
  sendPostNewsletterFanOut,
  type PostNewsletterFanOutResult,
} from './post-newsletter-fanout';
import {
  buildWeeklyRoundupContent,
  type RoundupPost,
  type RoundupStream,
} from './weekly-roundup';

export type WeeklyRoundupSummary = {
  weekStart: string;
  weekEnd: string;
  streams: Array<{
    stream: RoundupStream;
    postCount: number;
    skipped: boolean;
    skippedReason?: string;
    fanOut?: PostNewsletterFanOutResult;
  }>;
  allSucceeded: boolean;
};

type Options = {
  now?: Date;
  /** Override the trailing window length (default 7 days). */
  windowDays?: number;
  /** Test seam: inject the AC fan-out caller. */
  sendFanOut?: typeof sendPostNewsletterFanOut;
};

type GroupCategoryById = Map<string, string | null>;

async function loadGroupCategoryMap(payload: Payload): Promise<GroupCategoryById> {
  // Posts.group is the group slug, so we key by slug.
  const result = await payload.find({
    collection: 'groups',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const map: GroupCategoryById = new Map();
  for (const g of result.docs as Array<{ slug?: string | null; category?: string | null }>) {
    if (typeof g.slug === 'string' && g.slug) {
      map.set(g.slug, (g.category as string | null) ?? null);
    }
  }
  return map;
}

async function loadPostsInWindow(
  payload: Payload,
  weekStart: Date,
  weekEnd: Date,
): Promise<Post[]> {
  const result = await payload.find({
    collection: 'posts',
    pagination: false,
    sort: 'publishedDate',
    depth: 1,
    overrideAccess: true,
    where: {
      and: [
        { publish_status: { in: ['published', 'sent'] } },
        { publishedDate: { greater_than_equal: weekStart.toISOString() } },
        { publishedDate: { less_than_equal: weekEnd.toISOString() } },
      ],
    },
  });
  return result.docs as Post[];
}

async function toRoundupPost(payload: Payload, post: Post): Promise<RoundupPost> {
  const groupSlug = typeof post.group === 'string' ? post.group : null;
  let groupBlock: RoundupPost['group'] = null;
  let partIndex: number | null = null;
  if (groupSlug) {
    const gl = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const g = gl.docs[0] as
      | { slug?: string | null; title?: string | null; image?: string | null }
      | undefined;
    if (g) {
      groupBlock = {
        slug: g.slug ?? null,
        title: g.title ?? null,
        image: g.image ?? null,
      };
    }
    partIndex = await computePostPartIndex(payload, post.slug as string, groupSlug);
  }
  return {
    slug: post.slug as string,
    title: post.title as string,
    excerpt: post.excerpt as string | null | undefined,
    publishedDate: (post.publishedDate as string | null | undefined) ?? null,
    group: groupBlock,
    partIndex,
  };
}

/**
 * Returns the inclusive [start, end] window for the trailing N days ending
 * at `now`. End is `now`; start is `now - N days`. Caller-controlled so
 * tests can pin the clock.
 */
export function computeRoundupWindow(now: Date, windowDays = 7): { weekStart: Date; weekEnd: Date } {
  const weekEnd = new Date(now.getTime());
  const weekStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  return { weekStart, weekEnd };
}

export async function runWeeklyRoundup(
  payload: Payload,
  options: Options = {},
): Promise<WeeklyRoundupSummary> {
  const now = options.now ?? new Date();
  const { weekStart, weekEnd } = computeRoundupWindow(now, options.windowDays ?? 7);
  const sendFanOut = options.sendFanOut ?? sendPostNewsletterFanOut;

  const [groupCategories, posts] = await Promise.all([
    loadGroupCategoryMap(payload),
    loadPostsInWindow(payload, weekStart, weekEnd),
  ]);

  const fictionPosts: Post[] = [];
  const essayPosts: Post[] = [];
  for (const post of posts) {
    const groupSlug = typeof post.group === 'string' ? post.group : null;
    const category = groupSlug ? groupCategories.get(groupSlug) ?? null : null;
    if (category === 'fiction') {
      fictionPosts.push(post);
    } else {
      essayPosts.push(post);
    }
  }

  const summary: WeeklyRoundupSummary = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    streams: [],
    allSucceeded: true,
  };

  for (const [stream, streamPosts, groupCategory] of [
    ['fiction', fictionPosts, 'fiction'] as const,
    ['essays', essayPosts, 'writing'] as const,
  ]) {
    if (streamPosts.length === 0) {
      summary.streams.push({
        stream,
        postCount: 0,
        skipped: true,
        skippedReason: 'no posts in window',
      });
      continue;
    }

    const roundupPosts = await Promise.all(
      streamPosts.map((p) => toRoundupPost(payload, p)),
    );
    const { subject, htmlBody, textBody } = buildWeeklyRoundupContent({
      stream,
      posts: roundupPosts,
      weekStart,
      weekEnd,
    });

    // Slug doubles as the AC campaign name suffix. Date-stamp so re-running
    // a missed cron the next day creates a distinct campaign rather than
    // colliding visually with the last week's send in the AC dashboard.
    const slug = `weekly-${stream}-${weekEnd.toISOString().slice(0, 10)}`;

    const fanOut = await sendFanOut({
      subject,
      htmlBody,
      textBody,
      slug,
      // Send immediately. AC's scheduledSendAt clamps past times to now anyway.
      scheduledSendAt: now,
      groupCategory,
    });

    if (!fanOut.allSucceeded) summary.allSucceeded = false;
    summary.streams.push({
      stream,
      postCount: streamPosts.length,
      skipped: false,
      fanOut,
    });
  }

  return summary;
}
