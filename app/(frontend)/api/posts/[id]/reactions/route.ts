import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { z } from 'zod';

import payloadConfig from '@payload-config';
import {
  REACTION_EMOJIS,
  isPostPubliclyVisible,
  parsePostId,
  snapshotReactions,
  toggleReaction,
} from '@/lib/reactions';
import { parseBody } from '@/lib/validation';

const bodySchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
  clientId: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const postId = parsePostId(id);
  if (postId === null) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const payload = await getPayload({ config: payloadConfig });
  if (!(await isPostPubliclyVisible(payload, postId))) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const clientId = new URL(request.url).searchParams.get('clientId');
  const validClientId = clientId && z.string().uuid().safeParse(clientId).success ? clientId : null;
  const snapshot = await snapshotReactions(payload, postId, validClientId);
  return NextResponse.json(snapshot);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const postId = parsePostId(id);
  if (postId === null) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const parsed = await parseBody(bodySchema, request);
  if (!parsed.ok) return parsed.response;

  const payload = await getPayload({ config: payloadConfig });
  if (!(await isPostPubliclyVisible(payload, postId))) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const { snapshot } = await toggleReaction(payload, {
    postId,
    emoji: parsed.data.emoji,
    clientId: parsed.data.clientId,
  });
  return NextResponse.json(snapshot);
}
