export default function SiteFooter() {
  return (
    <footer
      className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-10 px-4 shadow-[0_-4px_24px_var(--glow-pink)]"
      style={{ marginTop: '3rem' }}
    >
      <div className="mx-auto max-w-[800px]">
        <form
          action="https://buttondown.com/api/emails/embed-subscribe/thearcades"
          method="post"
          className="embeddable-buttondown-form space-y-3 [&_p]:m-0"
        >
          <label htmlFor="bd-email" className="block text-sm text-[var(--fg-muted)]">
            Enter your email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="email"
              name="email"
              id="bd-email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--btn-bg)] px-3 py-2.5 text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
            />
            <input
              type="submit"
              value="Subscribe"
              className="button-link cursor-pointer border-0 text-center sm:w-auto"
            />
          </div>
          <p className="pt-1 text-sm text-[var(--fg-muted)]">
            <a
              href="https://buttondown.com/refer/thearcades"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by Buttondown.
            </a>
          </p>
        </form>
      </div>
    </footer>
  );
}
