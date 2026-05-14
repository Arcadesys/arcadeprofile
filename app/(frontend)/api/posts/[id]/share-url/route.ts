import { NextResponse } from 'next/server';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { resolvePostShareUrl } from '@/lib/post-share-url';
import type { ShareUrlResponse } from '@/lib/post-share-url-types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;
  const { payload } = auth.ctx;
  const { id } = await params;

  const result = await resolvePostShareUrl(payload, id);
  return NextResponse.json<ShareUrlResponse>(result);
}
