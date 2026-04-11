import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from 'lexical';

type NewsletterContent = {
  htmlBody: string;
  textBody: string;
};

type PostInput = {
  content: SerializedEditorState;
  excerpt?: string | null;
  slug: string;
  title: string;
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

function renderPostContent(post: PostInput): string {
  try {
    return convertLexicalToHTML({
      data: post.content,
      disableContainer: true,
    }).trim();
  } catch (error) {
    console.error('[newsletter] Failed to convert Lexical content to HTML:', error);
    return '';
  }
}

export function buildPostNewsletterContent(
  post: PostInput,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
): NewsletterContent {
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const escapedTitle = escapeHtml(post.title);
  const excerpt = post.excerpt?.trim() || '';
  const escapedExcerpt = excerpt ? escapeHtml(excerpt) : '';
  const contentHtml = renderPostContent(post);

  const htmlBody = `
    <article style="font-family: Georgia, serif; color: #111827; line-height: 1.7;">
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
