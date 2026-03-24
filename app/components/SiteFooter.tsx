import SubscribeForm from '@/app/components/SubscribeForm';

export default function SiteFooter() {
  return (
    <footer
      className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-10 px-4 shadow-[0_-4px_24px_var(--glow-pink)]"
      style={{ marginTop: '3rem' }}
    >
      <div className="mx-auto max-w-[800px]">
        <SubscribeForm />
      </div>
    </footer>
  );
}
