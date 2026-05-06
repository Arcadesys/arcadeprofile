import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { postToBluesky, atUriToWebUrl } from '@/lib/bluesky';
import { getPayload } from 'payload';
import config from '@payload-config';
import { parseBody } from '@/lib/validation';

const composePostSchema = z.object({
  text: z.string().trim().min(1, 'text is required'),
  platform: z.literal('bluesky', { message: 'Only bluesky platform is supported' }),
  variant: z.enum(['short', 'long', 'custom']).optional(),
  slug: z.string().optional(),
  linkUrl: z.string().optional(),
  scheduledAt: z
    .string()
    .refine((s) => !isNaN(new Date(s).getTime()), { message: 'Invalid scheduledAt date' })
    .refine((s) => new Date(s) > new Date(), { message: 'scheduledAt must be in the future' })
    .optional(),
});

type ComposePostBody = z.infer<typeof composePostSchema>;

async function handleComposePost(body: ComposePostBody) {
  const payload = await getPayload({ config });
  const variant = body.variant ?? 'custom';

  if (body.scheduledAt) {
    const scheduledDate = new Date(body.scheduledAt);

    const doc = await payload.create({
      collection: 'social-posts',
      data: {
        platform: body.platform,
        variant,
        text: body.text,
        slug: body.slug || undefined,
        linkUrl: body.linkUrl,
        status: 'scheduled',
        scheduledAt: scheduledDate.toISOString(),
      },
    });

    return NextResponse.json({ id: doc.id, status: 'scheduled', scheduledAt: scheduledDate.toISOString() });
  }

  try {
    const result = await postToBluesky(body.text, body.linkUrl);
    const postUrl = atUriToWebUrl(result.uri);

    const doc = await payload.create({
      collection: 'social-posts',
      data: {
        platform: body.platform,
        variant,
        text: body.text,
        slug: body.slug || undefined,
        linkUrl: body.linkUrl,
        status: 'posted',
        postedAt: new Date().toISOString(),
        postUri: result.uri,
        postUrl,
      },
    });

    return NextResponse.json({ id: doc.id, status: 'posted', postUri: result.uri, postUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    const doc = await payload.create({
      collection: 'social-posts',
      data: {
        platform: body.platform,
        variant,
        text: body.text,
        slug: body.slug || undefined,
        linkUrl: body.linkUrl,
        status: 'failed',
        failedAt: new Date().toISOString(),
        failureReason: message,
      },
    });

    return NextResponse.json({ error: message, id: doc.id, status: 'failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(composePostSchema, request);
  if (!parsed.ok) return parsed.response;
  return handleComposePost(parsed.data);
}
