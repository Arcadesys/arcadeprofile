import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from 'lexical';

import { logger } from './logger';
import { buildPostUrl } from './post-url';

type NewsletterContent = {
  htmlBody: string;
  textBody: string;
};

type MediaLike = {
  url?: string | null;
  alt?: string | null;
};

type GroupHero = {
  slug?: string | null;
  image?: string | null;
  title?: string | null;
};

type PostInput = {
  content: SerializedEditorState;
  excerpt?: string | null;
  slug: string;
  title: string;
  /**
   * Post meta — `meta.image` is the OG image upload, reused as the email hero
   * when present. Accepts the populated Media doc; an unpopulated id is
   * treated as "no hero" so the group fallback can run.
   */
  meta?: {
    image?: MediaLike | number | string | null;
  } | null;
  /**
   * Optional group/series this post belongs to. Used as a hero fallback when
   * the post itself has no meta.image. Group `image` is a text URL on the
   * Groups collection today.
   */
  group?: GroupHero | null;
  continuity?: {
    priorUrl?: string | null;
    priorTitle?: string | null;
    catchUpUrl?: string | null;
  } | null;
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

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderPostContent(content: SerializedEditorState): string {
  try {
    return convertLexicalToHTML({
      data: content,
      disableContainer: true,
    }).trim();
  } catch (error) {
    logger.error({ err: error }, '[newsletter] failed to convert Lexical content to HTML');
    return '';
  }
}

function toAbsoluteUrl(url: string, siteUrl: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;
  // Protocol-relative
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const base = siteUrl.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

type ResolvedHero = { src: string; alt: string } | null;

function resolveHeroImage(post: PostInput, siteUrl: string): ResolvedHero {
  // 1) Post meta.image, only when populated as a Media object with a URL.
  const metaImage = post.meta?.image;
  if (metaImage && typeof metaImage === 'object') {
    const url = metaImage.url?.trim();
    if (url) {
      return {
        src: toAbsoluteUrl(url, siteUrl),
        alt: metaImage.alt?.trim() || post.title,
      };
    }
  }

  // 2) Group fallback. group.image is a plain text URL on the Groups collection.
  const groupImage = post.group?.image?.trim();
  if (groupImage) {
    return {
      src: toAbsoluteUrl(groupImage, siteUrl),
      alt: post.group?.title?.trim() || post.title,
    };
  }

  return null;
}

export function buildPostNewsletterContent(
  post: PostInput,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
): NewsletterContent {
  const groupSlug = post.group?.slug?.trim() || '';
  const postPath =
    groupSlug && post.slug ? buildPostUrl(groupSlug, post.slug) : '/projects';
  const postUrl = `${siteUrl.replace(/\/+$/, '')}${postPath}`;
  const escapedTitle = escapeHtml(post.title);
  const excerpt = post.excerpt?.trim() || '';
  const escapedExcerpt = excerpt ? escapeHtml(excerpt) : '';
  const contentHtml = renderPostContent(post.content);
  const hero = resolveHeroImage(post, siteUrl);
  const priorUrl = post.continuity?.priorUrl ? toAbsoluteUrl(post.continuity.priorUrl, siteUrl) : '';
  const catchUpUrl = post.continuity?.catchUpUrl ? toAbsoluteUrl(post.continuity.catchUpUrl, siteUrl) : '';
  const continuityHtml = priorUrl || catchUpUrl
    ? `<p style="margin:1.25rem 0 0; font-size:0.95rem; color:${EMAIL_MUTED};">${priorUrl ? `<a href="${escapeHtml(priorUrl)}" style="color:${EMAIL_TEXT};">Previous chapter${post.continuity?.priorTitle ? `: ${escapeHtml(post.continuity.priorTitle)}` : ''}</a>` : ''}${priorUrl && catchUpUrl ? ' · ' : ''}${catchUpUrl ? `<a href="${escapeHtml(catchUpUrl)}" style="color:${EMAIL_TEXT};">Catch up on the serial</a>` : ''}</p>`
    : '';

  // <img> attributes are sized for email clients: an explicit width attribute
  // keeps Outlook from inflating the image, and the inline max-width plus
  // height:auto lets the layout shrink gracefully on narrow viewports.
  const heroHtml = hero
    ? `<img src="${escapeHtml(hero.src)}" alt="${escapeHtml(hero.alt)}" width="600" style="display:block; width:100%; max-width:600px; height:auto; margin:0 auto 1.5rem; border-radius:8px;" />`
    : '';

  const htmlBody = `
    <div style="margin:0; padding:24px 16px; background-color:${EMAIL_BACKGROUND}; color:${EMAIL_TEXT};">
      <article style="max-width:600px; margin:0 auto; font-family: Georgia, serif; color:${EMAIL_TEXT}; background-color:${EMAIL_BACKGROUND}; line-height:1.7;">
        ${heroHtml}
        <h1 style="font-size:2rem; line-height:1.2; margin:0 0 1rem; color:${EMAIL_TEXT};">${escapedTitle}</h1>
        ${escapedExcerpt ? `<p style="font-size:1.05rem; color:${EMAIL_MUTED}; margin:0 0 1.5rem;">${escapedExcerpt}</p>` : ''}
        <div style="color:${EMAIL_TEXT};">
          ${contentHtml || `<p style="color:${EMAIL_TEXT};">${escapedExcerpt || escapedTitle}</p>`}
        </div>
        <p style="margin-top:2rem;">
          <a href="${postUrl}" style="color:${EMAIL_TEXT}; font-weight:700; font-size:1.05rem;">Read chapter on the site</a>
        </p>
        ${continuityHtml}
      </article>
    </div>
  `.trim();

  const textParts = [
    post.title,
    excerpt,
    stripHtml(contentHtml),
    `Read on the site: ${postUrl}`,
    priorUrl && `Previous chapter: ${priorUrl}`,
    catchUpUrl && `Catch up on the serial: ${catchUpUrl}`,
  ].filter(Boolean);

  return {
    htmlBody,
    textBody: textParts.join('\n\n'),
  };
}
