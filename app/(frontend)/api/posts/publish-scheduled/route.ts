import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { authorizeCronRequest, getScheduledPostsPerRun } from '@/lib/cronAuth';
import type { Post } from '@/payload-types';

type PublishResult = {
  id: number;
  slug: string;
  status: 'published' | 'failed';
  error?: string;
};

async function publishScheduledPosts() {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const perRunLimit = getScheduledPostsPerRun();

  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 0,
    sort: ['scheduledPublishDate', 'order'],
    where: {
      and: [
        {
          _status: { equals: 'draft' },
        },
        {
          publish_status: { equals: 'scheduled' },
        },
        {
          scheduledPublishDate: { less_than_equal: now },
        },
      ],
    },
  });

  const duePosts = result.docs as Post[];
  const postsToPublish = perRunLimit ? duePosts.slice(0, perRunLimit) : duePosts;
  const results: PublishResult[] = [];

  for (const post of postsToPublish) {
    try {
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          _status: 'published',
          publish_status: 'published',
          publishedDate: post.scheduledPublishDate || now,
        },
        depth: 0,
        draft: false,
        overrideAccess: true,
      });

      results.push({
        id: post.id,
        slug: post.slug,
        status: 'published',
      });
    } catch (error) {
      results.push({
        id: post.id,
        slug: post.slug,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const processed = results.filter((result) => result.status === 'published').length;
  const failed = results.length - processed;

  return NextResponse.json({
    due: duePosts.length,
    processed,
    failed,
    skipped: Math.max(duePosts.length - postsToPublish.length, 0),
    results,
  });
}

async function handleRequest(request: Request) {
  const unauthorizedResponse = authorizeCronRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return publishScheduledPosts();
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
