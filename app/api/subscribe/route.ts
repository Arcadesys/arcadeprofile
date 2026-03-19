import { NextRequest, NextResponse } from 'next/server';

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;

export async function POST(request: NextRequest) {
  if (!BUTTONDOWN_API_KEY) {
    return NextResponse.json(
      { error: 'Email subscription is not configured.' },
      { status: 503 }
    );
  }

  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Token ${BUTTONDOWN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, type: 'regular' }),
    });

    if (res.status === 201) {
      return NextResponse.json({ ok: true });
    }

    if (res.status === 409) {
      return NextResponse.json({ ok: true, message: 'Already subscribed!' });
    }

    const err = await res.text();
    console.error('Buttondown subscribe failed:', res.status, err);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 502 }
    );
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
