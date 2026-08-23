import { markdownToPlaintext, markdownToSafeHtml } from './markdown-render';
import { buildPostUrl } from './post-url';

export type NewsletterContent = {
  htmlBody: string;
  textBody: string;
};

type PostInput = {
  markdownBody: string;
  excerpt?: string | null;
  slug: string;
  title: string;
  hero?: { src: string; alt: string } | null;
  group: {
    slug: string;
    image?: string | null;
    title?: string | null;
  };
};

const DEFAULT_SITE_URL = 'https://thearcades.me';
const EMAIL_BACKGROUND = '#ffffff';
const EMAIL_TEXT = '#111827';
const EMAIL_MUTED = '#4b5563';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAbsoluteUrl(url: string, siteUrl: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const base = siteUrl.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export function buildPostNewsletterContent(
  post: PostInput,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
): NewsletterContent {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const postUrl = `${baseUrl}${buildPostUrl(post.group.slug, post.slug)}`;
  const escapedTitle = escapeHtml(post.title);
  const excerpt = post.excerpt?.trim() || '';
  const escapedExcerpt = excerpt ? escapeHtml(excerpt) : '';
  const contentHtml = markdownToSafeHtml(post.markdownBody);
  const hero = post.hero ?? (
    post.group.image
      ? {
          src: toAbsoluteUrl(post.group.image, baseUrl),
          alt: post.group.title?.trim() || post.title,
        }
      : null
  );
  const heroHtml = hero
    ? `<img src="${escapeHtml(toAbsoluteUrl(hero.src, baseUrl))}" alt="${escapeHtml(hero.alt)}" width="600" style="display:block; width:100%; max-width:600px; height:auto; margin:0 auto 1.5rem; border-radius:8px;" />`
    : '';

  return {
    htmlBody: `
      <div style="margin:0; padding:24px 16px; background-color:${EMAIL_BACKGROUND}; color:${EMAIL_TEXT};">
        <article style="max-width:600px; margin:0 auto; font-family: Georgia, serif; color:${EMAIL_TEXT}; background-color:${EMAIL_BACKGROUND}; line-height:1.7;">
          ${heroHtml}
          <h1 style="font-size:2rem; line-height:1.2; margin:0 0 1rem; color:${EMAIL_TEXT};">${escapedTitle}</h1>
          ${escapedExcerpt ? `<p style="font-size:1.05rem; color:${EMAIL_MUTED}; margin:0 0 1.5rem;">${escapedExcerpt}</p>` : ''}
          <div style="color:${EMAIL_TEXT};">${contentHtml}</div>
          <p style="margin-top:2rem;">
            <a href="${postUrl}" style="color:${EMAIL_TEXT}; font-weight:700; font-size:1.05rem;">Read essay on the site</a>
          </p>
        </article>
      </div>
    `.trim(),
    textBody: [
      post.title,
      excerpt,
      markdownToPlaintext(post.markdownBody),
      `Read on the site: ${postUrl}`,
    ].filter(Boolean).join('\n\n'),
  };
}
