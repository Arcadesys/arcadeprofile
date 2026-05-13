import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { redirect } from 'next/navigation';

import HopperBoard from './HopperBoard';

export default async function HopperView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const user = req?.user;
  if (!user) {
    redirect('/admin/login?redirect=/admin/hopper');
  }
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <HopperBoard />
    </DefaultTemplate>
  );
}
