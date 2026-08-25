'use client';

import { usePathname } from 'next/navigation';
import SubscriptionForm from './SubscriptionForm';

const ROUTES_WITH_OWN_FORM = new Set(['/', '/projects', '/bio', '/latest', '/store', '/subscribe', '/novels/it-takes-a-zoo']);

function hasOwnForm(pathname: string): boolean {
  return ROUTES_WITH_OWN_FORM.has(pathname)
    || /^\/projects\/[^/]+\/[^/]+$/.test(pathname)
    || /^\/novels\/it-takes-a-zoo\/[^/]+$/.test(pathname)
    || /^\/this-is-what-i-do-for-fun\/[^/]+$/.test(pathname)
    || /^\/portfolio\/[^/]+$/.test(pathname)
    || /^\/lab\/[^/]+$/.test(pathname);
}

export default function FooterSubscribe() {
  const pathname = usePathname();
  if (pathname && hasOwnForm(pathname)) return null;

  return (
    <SubscriptionForm
      source="footer"
      audiences={['all']}
      updateMode="add"
      magnet="story"
      presentation="compact"
      submitLabel="Send me new work"
    />
  );
}
