'use client';

import { useEffect, useState } from 'react';

interface ShareLinksProps {
  url: string;
  title: string;
}

type ToastKind = 'copied' | 'instagram';

export default function ShareLinks({ url, title }: ShareLinksProps) {
  const [toast, setToast] = useState<ToastKind | null>(null);

  useEffect(() => {
    if (!toast) return;
    const duration = toast === 'instagram' ? 3200 : 2400;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast]);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedShareText = encodeURIComponent(`${title} ${url}`);

  const targets: Array<{ name: string; href: string; icon: React.ReactNode }> = [
    {
      name: 'Bluesky',
      href: `https://bsky.app/intent/compose?text=${encodedShareText}`,
      icon: <BlueskyIcon />,
    },
    {
      name: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: <XIcon />,
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <LinkedInIcon />,
    },
    {
      name: 'Reddit',
      href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      icon: <RedditIcon />,
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FacebookIcon />,
    },
  ];

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    if (await copyToClipboard()) {
      setToast('copied');
    }
  }

  async function handleInstagram() {
    // Instagram has no public web-share URL — copy the link so the reader can
    // paste it into their story or DM.
    if (await copyToClipboard()) {
      setToast('instagram');
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={labelStyle}>Share this</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        {targets.map((t) => (
          <a
            key={t.name}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${t.name}`}
            title={`Share on ${t.name}`}
            style={iconButtonStyle}
          >
            {t.icon}
          </a>
        ))}
        <button
          type="button"
          onClick={handleInstagram}
          aria-label="Copy link for Instagram"
          title="Copy link for Instagram"
          style={iconButtonStyle}
        >
          <InstagramIcon />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy link"
          title="Copy link"
          style={iconButtonStyle}
        >
          <LinkIcon />
        </button>
        <span
          role="status"
          aria-live="polite"
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--neon-pink)',
            marginLeft: '0.25rem',
            minHeight: '1em',
          }}
        >
          {toast === 'copied' && '✓ Link copied'}
          {toast === 'instagram' && '✓ Link copied — paste into Instagram'}
        </span>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
  color: 'var(--fg-muted)',
  textTransform: 'uppercase',
  margin: '0 0 0.6rem',
};

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2rem',
  height: '2rem',
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
  padding: 0,
};

// ── icons (24x24 viewBox, current colour) ────────────────────────────────────

function BlueskyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.2 4.3c2.6 1.9 5.4 5.9 6.4 8 1-2.1 3.8-6.1 6.4-8 1.9-1.4 5-2.5 5 1 0 .7-.4 5.9-.6 6.7-.7 2.9-3.7 3.6-6.3 3.2 4.6.8 5.7 3.4 3.2 6-4.8 4.9-6.9-1.2-7.4-2.7l-.1-.3-.1.3c-.5 1.5-2.6 7.6-7.4 2.7-2.5-2.6-1.4-5.2 3.2-6-2.6.4-5.6-.3-6.3-3.2-.2-.8-.6-6-.6-6.7 0-3.5 3.1-2.4 5-1z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.7 13.5c0 .1.1.2.1.3 0 2.6-3.1 4.8-6.9 4.8s-6.9-2.1-6.9-4.8c0-.1 0-.2.1-.3-.5-.2-.9-.7-.9-1.4 0-.8.6-1.4 1.4-1.4.4 0 .7.1 1 .4 1.2-.8 2.7-1.3 4.5-1.4l1-4 3.4.7c.2-.5.7-.8 1.3-.8.8 0 1.4.6 1.4 1.4s-.6 1.4-1.4 1.4c-.7 0-1.3-.5-1.4-1.2l-2.9-.6-.7 2.9c1.7.1 3.3.6 4.5 1.4.3-.2.6-.4 1-.4.8 0 1.4.6 1.4 1.4 0 .6-.4 1.1-.9 1.4zM8.6 13c0-.7-.6-1.3-1.3-1.3-.7 0-1.3.6-1.3 1.3 0 .7.6 1.3 1.3 1.3.7 0 1.3-.6 1.3-1.3zm6.1 0c0-.7-.6-1.3-1.3-1.3-.7 0-1.3.6-1.3 1.3 0 .7.6 1.3 1.3 1.3.7 0 1.3-.6 1.3-1.3zm-.4 2.7c-.6.6-1.6.9-2.6.9s-2-.3-2.6-.9c-.1-.1-.3-.1-.4 0-.1.1-.1.3 0 .4.7.7 1.9 1.1 3 1.1s2.3-.4 3-1.1c.1-.1.1-.3 0-.4-.1-.1-.3-.1-.4 0z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
