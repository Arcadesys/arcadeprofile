'use client';

import { usePathname } from 'next/navigation';
import { hasEndOfPieceSignup } from '@/lib/end-of-piece-routes';
import SubscriptionForm from './SubscriptionForm';

export default function FooterSubscribe() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const hasPieceSpecificSignup =
    (segments[0] === 'novels' && segments[1] === 'it-takes-a-zoo' && segments.length === 3) ||
    (segments[0] === 'projects' && segments.length === 3 && segments[1] !== 'queer-columns') ||
    (segments[0] === 'this-is-what-i-do-for-fun' && segments.length === 2) ||
    (segments[0] === 'portfolio' && segments.length === 2) ||
    (segments[0] === 'lab' && segments.length === 2);
  if (
    hasPieceSpecificSignup ||
    pathname === '/subscribe' ||
    pathname === '/queercolumns' || pathname.startsWith('/queercolumns/') ||
    pathname === '/projects/queer-columns' || pathname.startsWith('/projects/queer-columns/') ||
    hasEndOfPieceSignup(pathname)
  ) return null;

  return (
    <section aria-labelledby="footer-subscribe-heading">
      <h2 id="footer-subscribe-heading" style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.5rem, 4vw, 2rem)', lineHeight: 1.2 }}>
        Get new writing by email
      </h2>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--fg-muted)', fontSize: '1.125rem', lineHeight: 1.6 }}>
        Stories and essays when they&rsquo;re ready. Confirm your email to join the list.
      </p>
      <SubscriptionForm
        source="footer"
        audiences={['all']}
        updateMode="add"
        presentation="compact"
        submitLabel="Send confirmation email"
        successMessage="Check your inbox to confirm your subscription."
      />
    </section>
  );
}
