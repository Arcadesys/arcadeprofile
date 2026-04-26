import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store — Coming Soon',
  description: 'The Arcades store is coming soon.',
};

export default function StorePage() {
  return (
    <div className="austenbox" style={{ maxWidth: '740px', margin: '0 auto' }}>
      <section
        style={{
          marginTop: '4rem',
          marginBottom: '4rem',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
        }}
      >
        <h1
          className="gaysparkles"
          style={{ fontSize: '2.25rem', marginBottom: '1rem' }}
        >
          Store
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--fg-muted)', margin: 0 }}>
          Coming soon.
        </p>
      </section>
    </div>
  );
}
