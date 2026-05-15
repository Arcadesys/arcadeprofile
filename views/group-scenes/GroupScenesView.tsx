import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { redirect } from 'next/navigation';

import GroupScenesBoard from './GroupScenesBoard';

export default async function GroupScenesView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const user = req?.user;
  if (!user) {
    redirect('/admin/login?redirect=/admin/group-scenes');
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
      <GroupScenesBoard />
    </DefaultTemplate>
  );
}
