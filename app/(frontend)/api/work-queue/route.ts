import { NextResponse } from 'next/server';

import { requirePayloadUser } from '@/lib/payloadSessionAuth';
import {
  isWorkItemStatus,
  isWorkItemType,
  parseWorkItemInput,
} from '@/lib/work-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');

  if (type && !isWorkItemType(type)) {
    return NextResponse.json({ error: 'Invalid work item type.' }, { status: 400 });
  }
  if (status && !isWorkItemStatus(status)) {
    return NextResponse.json({ error: 'Invalid work item status.' }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (type) where.type = { equals: type };
  if (status) where.status = { equals: status };

  const result = await auth.ctx.payload.find({
    collection: 'work-items',
    depth: 1,
    pagination: false,
    sort: ['status', 'position', 'createdAt'],
    where,
    overrideAccess: false,
    user: auth.ctx.user,
  });

  return NextResponse.json({ items: result.docs });
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requirePayloadUser(request);
  if ('response' in auth) return auth.response;

  try {
    const data = parseWorkItemInput(await request.json());
    const item = await auth.ctx.payload.create({
      collection: 'work-items',
      data: {
        title: data.title!,
        type: data.type!,
        parent: data.parent ?? null,
        definitionOfDone: data.definitionOfDone,
        owner: data.owner ?? 'human',
        budgetUsd: data.budgetUsd ?? 0,
        status: data.status ?? 'inbox',
        position: data.position ?? 0,
      },
      depth: 1,
      overrideAccess: false,
      user: auth.ctx.user,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create work item.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
