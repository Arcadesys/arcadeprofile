import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.ACTIVECAMPAIGN_API_URL;
const API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
const LIST_ID = process.env.ACTIVECAMPAIGN_LIST_ID || '1';

const VALID_TAGS = ['fiction', 'tech', 'updates'];

export async function POST(request: NextRequest) {
  if (!API_URL || !API_KEY) {
    return NextResponse.json(
      { error: 'Email subscription is not configured.' },
      { status: 503 }
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
    // Create or update the contact
    const contactRes = await fetch(`${API_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: { email },
      }),
    });

    if (!contactRes.ok) {
      const err = await contactRes.text();
      console.error('ActiveCampaign contact sync failed:', err);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 502 }
      );
    }

    const { contact } = await contactRes.json();

    // Add the contact to the list
    const listRes = await fetch(`${API_URL}/api/3/contactLists`, {
      method: 'POST',
      headers: {
        'Api-Token': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactList: {
          list: LIST_ID,
          contact: contact.id,
          status: 1,
        },
      }),
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      console.error('ActiveCampaign list add failed:', err);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 502 }
      );
    }

    // Look up tag IDs by name and add them to the contact
    for (const tagName of selectedTags) {
      const tagSearchRes = await fetch(
        `${API_URL}/api/3/tags?search=${encodeURIComponent(tagName)}`,
        {
          headers: { 'Api-Token': API_KEY },
        }
      );

      if (!tagSearchRes.ok) continue;

      const { tags: matchedTags } = await tagSearchRes.json();
      const tagMatch = matchedTags?.find(
        (t: { tag: string }) => t.tag.toLowerCase() === tagName.toLowerCase()
      );

      if (!tagMatch) continue;

      await fetch(`${API_URL}/api/3/contactTags`, {
        method: 'POST',
        headers: {
          'Api-Token': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactTag: {
            contact: contact.id,
            tag: tagMatch.id,
          },
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
