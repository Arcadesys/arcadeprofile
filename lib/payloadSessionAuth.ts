import { NextResponse } from 'next/server';
import { getPayload, type Payload } from 'payload';
import config from '@payload-config';

import type { User } from '@/payload-types';

export interface AuthedContext {
  payload: Payload;
  user: User;
}

export async function requirePayloadUser(
  request: Request,
): Promise<{ ctx: AuthedContext } | { response: NextResponse }> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ctx: { payload, user: user as User } };
}
