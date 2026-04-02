import { NextRequest, NextResponse } from 'next/server';
import { syncContact, addToList, addTagsToContact } from '@/lib/activecampaign';

const VALID_TAGS = ['fiction', 'tech', 'updates'];

export async function POST(request: NextRequest) {
  if (!process.env.ACTIVECAMPAIGN_API_URL || !process.env.ACTIVECAMPAIGN_API_KEY) {
    return NextResponse.json(
      { error: 'Email subscription is not configured.' },
      { status: 503 },
    );
  }

  const { email, tags } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const selectedTags: string[] = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === 'string' && VALID_TAGS.includes(t))
    : VALID_TAGS;

  try {
    const contactId = await syncContact(email);
    await addToList(contactId);
    if (selectedTags.length > 0) {
      await addTagsToContact(contactId, selectedTags);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
