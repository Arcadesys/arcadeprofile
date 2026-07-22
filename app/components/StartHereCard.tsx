import Link from 'next/link';

const DEFAULT_QUOTE =
  'My name is Carl and I work at Floor-Mart. I always have worked at Floor-Mart and I always will work at Floor-Mart, forever and ever, amen.';

const DEFAULT_TAGS = ['heartrending', 'queer', 'radical', 'cozy'];

interface Props {
  href: string;
  title?: string;
  quote?: string;
  tags?: string[];
  ctaLabel?: string;
}

export default function StartHereCard({
  href,
  title = 'Carl',
  quote = DEFAULT_QUOTE,
  tags = DEFAULT_TAGS,
  ctaLabel,
}: Props) {
  return (
    <section
      aria-labelledby="start-here-title"
      style={{
        margin: '0 0 2.5rem',
        padding: '1.75rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 0 30px var(--glow-pink)',
        position: 'relative',
      }}
    >
      <p
        style={{
          margin: '0 0 0.75rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
        }}
      >
        new here? start with this one
      </p>

      <h2
        id="start-here-title"
        style={{
          margin: '0 0 0.6rem',
          fontFamily: 'var(--font-serif)',
          fontSize: '2rem',
          lineHeight: 1.1,
          color: 'var(--fg)',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: '0 0 0.75rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          letterSpacing: '0.04em',
          color: 'var(--fg-muted)',
        }}
      >
        {tags.join(' · ')}
      </p>

      <p
        style={{
          margin: '0 0 1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          color: 'var(--fg-muted)',
        }}
      >
        Read it in your browser. No signup.
      </p>

      <div
        style={{
          position: 'relative',
          margin: '0 0 1.5rem',
          paddingBottom: '2.25rem',
          overflow: 'hidden',
        }}
      >
        <blockquote
          style={{
            margin: 0,
            padding: '0 0 0 1rem',
            borderLeft: '2px solid var(--neon-pink)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: 'var(--fg)',
          }}
        >
          {`“${quote}”`}
        </blockquote>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 'auto 0 0 0',
            height: '3rem',
            background:
              'linear-gradient(to bottom, transparent 0%, var(--surface) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          marginBottom: '0.85rem',
        }}
      >
        <Link
          href={href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.2rem',
            background: 'var(--neon-pink)',
            color: '#000',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            boxShadow: '0 0 18px var(--glow-pink)',
          }}
        >
          {ctaLabel ?? `Read ${title}`} &rarr;
        </Link>
        <a
          href="/subscribe"
          className="button-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1.1rem',
            fontSize: '0.85rem',
          }}
        >
          Subscribe
        </a>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          color: 'var(--fg-muted)',
        }}
      >
        fiction &amp; essays · every installment as it lands
      </p>
    </section>
  );
}
