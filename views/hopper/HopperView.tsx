import type { AdminViewServerProps } from 'payload';
import { redirect } from 'next/navigation';

import HopperBoard from './HopperBoard';

export default async function HopperView({ initPageResult }: AdminViewServerProps) {
  const user = initPageResult?.req?.user;
  if (!user) {
    redirect('/admin/login?redirect=/admin/hopper');
  }
  return <HopperBoard />;
}
