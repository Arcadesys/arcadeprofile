import SubscriptionForm from './SubscriptionForm';

export default function FooterSubscribe() {
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
