import type { Metadata } from 'next';

import SubscriptionForm from '@/app/components/SubscriptionForm';
import { SITE_NAME } from '@/lib/site-brand';

export const metadata: Metadata = {
  title: 'Subscribe',
  description: 'Choose which writing and build notes you want by email.',
  alternates: { canonical: '/subscribe' },
};

export default function SubscribePage() {
  return (
    <main style={{ width: 'min(100% - 2rem, 760px)', margin: '0 auto', padding: 'clamp(3rem, 8vw, 6rem) 0' }}>
      <p style={{ margin: '0 0 0.75rem', color: 'var(--neon-pink)', fontSize: '1.125rem', fontWeight: 700 }}>
        {SITE_NAME}
      </p>
      <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(2.4rem, 8vw, 4.5rem)', lineHeight: 1.1 }}>
        Get new writing by email
      </h1>
      <p style={{ maxWidth: '62ch', color: 'var(--fg-muted)', fontSize: '1.125rem', lineHeight: 1.8 }}>
        Choose the updates you want. Each selected preference gets its own confirmation email; confirm each one to join that list.
      </p>
      <SubscriptionForm
        source="subscribe-page"
        audiences={['all']}
        updateMode="add"
        showPreferences
        submitLabel="Send confirmation email"
        successMessage="Check your inbox to confirm your subscription."
      />
    </main>
  );
}
