/**
 * Weekly roundup digest builder.
 *
 * The cron at /api/posts/weekly-roundup runs Sunday morning, pulls posts
 * published in the trailing 7 days, and splits them by stream (fiction
 * vs essays) using the post's group category. This module produces the
 * email body for one stream's digest.
 */
import type { SerializedEditorState } from 'lexical';

import { escapeHtml } from './newsletter';
import { buildPostUrl } from './post-url';

const DEFAULT_SITE_URL = 'https://thearcades.me';

export type RoundupStream = 'fiction' | 'essays';

export type RoundupPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  /** Post meta — used for the link image, but not embedded in the digest. */
  publishedDate?: string | null;
  group?: {
    slug?: string | null;
    title?: string | null;
    image?: string | null;
  } | null;
  /** 1-based index of the post within its group's published posts. Drives the canonical URL. */
  partIndex?: number | null;
  /**
   * Lexical content. Roundup HTML doesn't render the full body — only an
   * excerpt — so this is optional. Kept on the type for callers that pass
   * the populated post wholesale.
   */
  content?: SerializedEditorState | null;
};

export type WeeklyRoundupContent = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

export type BuildWeeklyRoundupOptions = {
  stream: RoundupStream;
  posts: RoundupPost[];
  /** Inclusive start of the digest window. */
  weekStart: Date;
  /** Inclusive end of the digest window. */
  weekEnd: Date;
  siteUrl?: string;
};

const STREAM_LABEL: Record<RoundupStream, string> = {
  fiction: 'Fiction',
  essays: 'Essays',
};

const STREAM_BLURB: Record<RoundupStream, string> = {
  fiction: 'New fiction this week from The Arcades.',
  essays: 'New essays this week from The Arcades.',
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function postUrl(post: RoundupPost, siteUrl: string): string {
  const groupSlug = post.group?.slug?.trim() || '';
  const partIndex = post.partIndex;
  const path =
    groupSlug && typeof partIndex === 'number' && partIndex > 0
      ? buildPostUrl(groupSlug, partIndex)
      : '/projects';
  return `${siteUrl.replace(/\/+$/, '')}${path}`;
}

function renderPostBlock(post: RoundupPost, siteUrl: string): string {
  const url = postUrl(post, siteUrl);
  const title = escapeHtml(post.title);
  const excerpt = post.excerpt?.trim();
  const groupTitle = post.group?.title?.trim();
  const meta = groupTitle ? escapeHtml(groupTitle) : '';

  return `
    <article style="margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb;">
      ${meta ? `<p style="font-size: 0.85rem; color: #6b7280; margin: 0 0 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">${meta}</p>` : ''}
      <h2 style="font-size: 1.4rem; line-height: 1.3; margin: 0 0 0.5rem;">
        <a href="${url}" style="color: #111827; text-decoration: none;">${title}</a>
      </h2>
      ${excerpt ? `<p style="color: #4b5563; margin: 0 0 0.75rem;">${escapeHtml(excerpt)}</p>` : ''}
      <p style="margin: 0;">
        <a href="${url}" style="color: #111827; font-weight: 600;">Read on the site →</a>
      </p>
    </article>
  `.trim();
}

function renderPostText(post: RoundupPost, siteUrl: string): string {
  const url = postUrl(post, siteUrl);
  const groupTitle = post.group?.title?.trim();
  const lines = [
    groupTitle ? `[${groupTitle}]` : null,
    post.title,
    post.excerpt?.trim() || null,
    `Read: ${url}`,
  ].filter(Boolean);
  return lines.join('\n');
}

/**
 * Build a weekly roundup email body for one stream. Callers should ALSO
 * decide audience routing — this function only produces the content. It
 * does NOT short-circuit on an empty post list; the caller is expected
 * to skip sending when `posts.length === 0`.
 */
export function buildWeeklyRoundupContent(
  options: BuildWeeklyRoundupOptions,
): WeeklyRoundupContent {
  const siteUrl = options.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const label = STREAM_LABEL[options.stream];
  const dateRange = `${formatDate(options.weekStart)}–${formatDate(options.weekEnd)}`;
  const subject = `${label} this week — ${dateRange}`;

  const intro = STREAM_BLURB[options.stream];
  const postBlocks = options.posts.map((p) => renderPostBlock(p, siteUrl)).join('\n');

  const htmlBody = `
    <article style="font-family: Georgia, serif; color: #111827; line-height: 1.6;">
      <header style="margin-bottom: 1.5rem;">
        <p style="font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.25rem;">${escapeHtml(dateRange)}</p>
        <h1 style="font-size: 1.8rem; line-height: 1.2; margin: 0 0 0.5rem;">${escapeHtml(label)} this week</h1>
        <p style="color: #4b5563; margin: 0;">${escapeHtml(intro)}</p>
      </header>
      ${postBlocks}
      <footer style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9rem;">
        <p style="margin: 0;">
          You're receiving this because you subscribed to The Arcades' ${escapeHtml(label.toLowerCase())} stream.
        </p>
      </footer>
    </article>
  `.trim();

  const textBody = [
    `${label} this week — ${dateRange}`,
    intro,
    '',
    ...options.posts.map((p) => renderPostText(p, siteUrl)),
  ].join('\n\n');

  return { subject, htmlBody, textBody };
}
