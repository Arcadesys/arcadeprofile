import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token.', { status: 400 });
  }

  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'subscribers',
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
  });

  if (result.docs.length === 0) {
    return new NextResponse('Invalid or expired unsubscribe link.', { status: 404 });
  }

  const subscriber = result.docs[0];

  await payload.update({
    collection: 'subscribers',
    id: subscriber.id,
    data: {
      unsubscribed: true,
      unsubscribedAt: new Date().toISOString(),
    },
  });

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;text-align:center;">
  <h1>You've been unsubscribed</h1>
  <p>You won't receive any more emails from The Arcades.</p>
  <p><a href="/">Back to site</a></p>
</body>
</html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    },
  );
}
