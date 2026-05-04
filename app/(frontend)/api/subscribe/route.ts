import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { syncSubscriberToActiveCampaign } from '@/lib/activecampaign';

const VALID_TAGS = ['fiction', 'tech', 'updates'];

export async function POST(request: NextRequest) {
  const { email, tags } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const selectedTags: string[] = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === 'string' && VALID_TAGS.includes(t))
    : VALID_TAGS;

  const tagArray = selectedTags.map((tag) => ({ tag: tag as 'fiction' | 'tech' | 'updates' }));

  try {
    const payload = await getPayload({ config });

    // Check if subscriber already exists
    const existing = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      const sub = existing.docs[0];
      // Reactivate if unsubscribed, and update tags
      await payload.update({
        collection: 'subscribers',
        id: sub.id,
        data: {
          tags: tagArray,
          unsubscribed: false,
          ...(sub.unsubscribed ? { unsubscribedAt: undefined } : {}),
        },
      });
    } else {
      await payload.create({
        collection: 'subscribers',
        data: {
          email,
          tags: tagArray,
        },
      });
    }

    // Push to ActiveCampaign so the contact lands in the configured list.
    // Failures here shouldn't roll back the Payload write — Payload is the
    // source of truth and the operator can resync from there if AC has an
    // outage. Log loudly so production issues are visible.
    try {
      await syncSubscriberToActiveCampaign({ email });
    } catch (acErr) {
      console.error('ActiveCampaign sync failed for subscriber:', email, acErr);
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
