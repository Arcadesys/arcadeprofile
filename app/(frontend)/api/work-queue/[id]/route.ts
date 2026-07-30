import { NextResponse } from 'next/server';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import { parseWorkItemInput } from '@/lib/work-queue';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid work item id.' }, { status: 400 });
  }

  try {
    const data = parseWorkItemInput(await request.json(), { partial: true });
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No supported changes supplied.' }, { status: 400 });
    }

    const item = await auth.ctx.payload.update({
      collection: 'work-items',
      id,
      data,
      depth: 1,
      overrideAccess: false,
      user: auth.ctx.user,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update work item.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
