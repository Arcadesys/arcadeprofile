'use client';

import { usePathname } from 'next/navigation';
import SubscribeCTA from './SubscribeCTA';

const ROUTES_WITH_OWN_FORM = new Set(['/projects', '/bio', '/subscribe']);

export default function FooterSubscribe() {
  const pathname = usePathname();
  if (pathname && ROUTES_WITH_OWN_FORM.has(pathname)) return null;

  return (
    <SubscribeCTA
      source="footer"
      magnet="story"
      variant="compact"
      heading="Don't lose the thread"
      blurb="New fiction and essays delivered the moment they publish. New here? Grab La Ligne du Marais — a Paris noir short — when you sign up."
      buttonLabel="Send the next one"
    />
  );
}
