import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from 'lexical';

type NewsletterContent = {
  htmlBody: string;
  textBody: string;
};

type MediaLike = {
  url?: string | null;
  alt?: string | null;
};

type GroupHero = {
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
};

const DEFAULT_SITE_URL = 'https://thearcades.me';

function escapeHtml(value: string): string {
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
    console.error('[newsletter] Failed to convert Lexical content to HTML:', error);
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
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const escapedTitle = escapeHtml(post.title);
  const excerpt = post.excerpt?.trim() || '';
  const escapedExcerpt = excerpt ? escapeHtml(excerpt) : '';
  const contentHtml = renderPostContent(post.content);
  const hero = resolveHeroImage(post, siteUrl);

  // <img> attributes are sized for email clients: an explicit width attribute
  // keeps Outlook from inflating the image, and the inline max-width plus
  // height:auto lets the layout shrink gracefully on narrow viewports.
  const heroHtml = hero
    ? `<img src="${escapeHtml(hero.src)}" alt="${escapeHtml(hero.alt)}" width="600" style="display:block; width:100%; max-width:600px; height:auto; margin:0 auto 1.5rem; border-radius:8px;" />`
    : '';

  const htmlBody = `
    <article style="font-family: Georgia, serif; color: #111827; line-height: 1.7;">
      ${heroHtml}
      <h1 style="font-size: 2rem; line-height: 1.2; margin-bottom: 1rem;">${escapedTitle}</h1>
      ${escapedExcerpt ? `<p style="font-size: 1.05rem; color: #4b5563; margin-bottom: 1.5rem;">${escapedExcerpt}</p>` : ''}
      ${contentHtml || `<p>${escapedExcerpt || escapedTitle}</p>`}
      <p style="margin-top: 2rem;">
        <a href="${postUrl}" style="color: #111827; font-weight: 600;">Read on the site</a>
      </p>
    </article>
  `.trim();

  const textParts = [
    post.title,
    excerpt,
    stripHtml(contentHtml),
    `Read on the site: ${postUrl}`,
  ].filter(Boolean);

  return {
    htmlBody,
    textBody: textParts.join('\n\n'),
  };
}
