import { NextRequest, NextResponse } from 'next/server';
import { readMarketing, writeMarketing, MarketingData } from '@/lib/marketing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const data = readMarketing(slug);
  if (!data) {
    return NextResponse.json({ slug, marketing: null });
  }
  return NextResponse.json({ slug, marketing: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let body: { marketing: MarketingData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.marketing || typeof body.marketing !== 'object') {
    return NextResponse.json({ error: 'Missing marketing data' }, { status: 400 });
  }

  writeMarketing(slug, body.marketing);
  return NextResponse.json({ ok: true });
}
