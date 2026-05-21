import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { redirect } from 'next/navigation';

import CalendarBoard from './CalendarBoard';

export default async function CalendarView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const user = req?.user;
  if (!user) {
    redirect('/admin/login?redirect=/admin/calendar');
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
      <CalendarBoard />
    </DefaultTemplate>
  );
}
