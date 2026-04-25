import SubscribeForm from '@/app/components/SubscribeForm';
import Link from 'next/link';

const footerGroups = [
  {
    title: 'Writing',
    links: [
      { href: '/previews', label: 'Previews' },
      { href: '/writing', label: 'Writing hub' },
      { href: '/blog', label: 'Blog archive' },
    ],
  },
  {
    title: 'Projects',
    links: [
      { href: '/projects', label: 'Projects' },
      { href: '/demos', label: 'Demos' },
      { href: '/mealplan', label: 'Meal planner' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/about', label: 'About Austen' },
      { href: '/resume', label: 'Resume' },
      { href: '/did', label: 'DID' },
      { href: '/betareader', label: 'Beta reader form' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer
      className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-10 px-4 shadow-[0_-4px_24px_var(--glow-pink)]"
      style={{ marginTop: '3rem' }}
    >
      <div className="mx-auto grid max-w-[980px] gap-8">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
            Start with a preview
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mb-1 text-xl font-bold text-[var(--fg)]">Read the work first.</h2>
              <p className="m-0 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
                Browse sample chapters and project excerpts, then subscribe or sign up as a beta reader if one catches.
              </p>
            </div>
            <Link href="/previews" className="button-link shrink-0 text-center">
              Browse previews
            </Link>
          </div>
        </section>

        <nav
          aria-label="Footer navigation"
          className="grid gap-6 border-b border-[var(--border)] pb-8 sm:grid-cols-3"
        >
          {footerGroups.map(group => (
            <div key={group.title}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                {group.title}
              </h2>
              <ul className="m-0 grid list-none gap-2 p-0">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--fg)] hover:text-[var(--neon-pink)] hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-auto w-full max-w-[800px]">
          <SubscribeForm />
        </div>
      </div>
    </footer>
  );
}
