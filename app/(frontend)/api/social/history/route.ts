import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET() {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'social-posts',
    sort: '-createdAt',
    limit: 100,
  });
  return NextResponse.json({ history: result.docs });
}

/** Cancel a scheduled post or delete a history entry */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const numericId = Number(id);

  let entry;
  try {
    entry = await payload.findByID({ collection: 'social-posts', id: numericId });
  } catch {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.status === 'scheduled') {
    const updated = await payload.update({
      collection: 'social-posts',
      id: numericId,
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    });
    return NextResponse.json({ ok: true, entry: updated });
  }

  await payload.delete({ collection: 'social-posts', id: numericId });
  return NextResponse.json({ ok: true });
}
