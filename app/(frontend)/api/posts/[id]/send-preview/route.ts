import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

import config from '@payload-config';
import { sendPostPreview } from '@/lib/send-preview';

const DEFAULT_TO = 'austen@thearcades.me';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = request.headers.get('authorization');
  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  let to = DEFAULT_TO;
  try {
    const body = await request.json();
    if (typeof body?.to === 'string' && body.to.includes('@')) to = body.to;
  } catch {
    // no body / not JSON — use default
  }

  const payload = await getPayload({ config });

  // Verify the API key belongs to a real user.
  const rawKey = apiKey.replace(/^users API-Key\s+/i, '').trim();
  const userCheck = await payload.find({
    collection: 'users',
    where: { apiKey: { equals: rawKey } },
    limit: 1,
    overrideAccess: true,
  });
  if (!userCheck.docs.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendPostPreview({ postId, to, payload });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
