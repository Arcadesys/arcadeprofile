import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';

import WorkQueueBoard from './WorkQueueBoard';

export const dynamic = 'force-dynamic';

export default async function WorkQueuePage() {
  const requestHeaders = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: requestHeaders });

  if (!user) {
    redirect('/admin/login?redirect=%2Fwork-queue');
  }

  const result = await payload.find({
    collection: 'work-items',
    depth: 1,
    pagination: false,
    sort: ['status', 'position', 'createdAt'],
    overrideAccess: false,
    user,
  });

  return <WorkQueueBoard initialItems={result.docs} />;
}
