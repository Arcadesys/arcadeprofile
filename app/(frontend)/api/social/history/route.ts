import { NextRequest, NextResponse } from 'next/server';
import { readHistory, updateHistoryEntry } from '@/lib/social';

export async function GET() {
  const data = readHistory();
  return NextResponse.json(data);
}

/** Cancel a scheduled post or delete a history entry */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }

  const data = readHistory();
  const entry = data.history.find(e => e.id === id);
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.status === 'scheduled') {
    // Cancel scheduled post
    const updated = updateHistoryEntry(id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, entry: updated });
  }

  // For non-scheduled entries, just remove from history
  data.history = data.history.filter(e => e.id !== id);
  const { writeHistory } = await import('@/lib/social');
  writeHistory(data);
  return NextResponse.json({ ok: true });
}
