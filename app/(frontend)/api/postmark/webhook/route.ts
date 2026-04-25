import { getPayload } from 'payload';
import config from '@payload-config';

import { handlePostmarkWebhook } from '@/lib/postmark-webhook-handler';

export async function POST(request: Request) {
  const payload = await getPayload({ config });
  return handlePostmarkWebhook(request, { payload });
}
