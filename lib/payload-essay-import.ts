import matter from 'gray-matter';
import { staticEssayFrontmatterSchema, sourceHash, type StaticEssayFrontmatter } from './static-essays';

type LexicalNode = {
  type?: string;
  text?: string;
  format?: number;
  url?: string;
  children?: LexicalNode[];
  fields?: Record<string, unknown>;
  value?: unknown;
  relationTo?: string;
};

export type PayloadEssayDocument = Record<string, unknown> & {
  id: string | number;
  slug: string;
  title: string;
  excerpt?: string;
  publishedDate: string;
  updatedAt?: string;
  publish_status: 'published' | 'sent';
  group: string | { slug?: string; title?: string };
  content: { root?: { children?: LexicalNode[] } };
};

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}\[\]<>])/g, '\\$1');
}

function inline(nodes: LexicalNode[] = []): string {
  return nodes.map(node => {
    if (node.type === 'link' || node.type === 'autolink') return `[${inline(node.children)}](${node.url ?? ''})`;
    if (node.type === 'paragraph' || node.type === 'listitem') return inline(node.children);
    if (node.type === 'linebreak') return '  \n';
    if (node.type !== 'text') throw new Error(`Unsupported Payload inline node: ${node.type ?? 'unknown'}.`);
    let text = escapeMarkdown(node.text ?? '');
    // Lexical bit flags: bold 1, italic 2, strikethrough 4, code 16.
    if (node.format && (node.format & 16)) text = `\`${text}\``;
    if (node.format && (node.format & 1)) text = `**${text}**`;
    if (node.format && (node.format & 2)) text = `*${text}*`;
    if (node.format && (node.format & 4)) text = `~~${text}~~`;
    return text;
  }).join('');
}

function mediaMarker(node: LexicalNode): string {
  const media = mediaReference(node.fields?.id ?? node.fields?.value ?? node.value, node.fields?.alt);
  if (!media) throw new Error('Payload upload node has no media identity.');
  const alt = media.alt ?? media.filename ?? 'Media';
  return `> **Media migration required:** ${alt} (Payload upload ${media.payloadMediaId}).\n`;
}

function markdownNodes(nodes: LexicalNode[] = [], depth = 0): string {
  return nodes.map(node => {
    const children = node.children ?? [];
    switch (node.type) {
      case 'heading': {
        const tag = typeof node.fields?.tag === 'string' ? node.fields.tag : 'h2';
        return `${'#'.repeat(Math.min(Math.max(Number(tag.replace('h', '')) || 2, 1), 6))} ${inline(children)}\n`;
      }
      case 'paragraph': return `${inline(children)}\n`;
      case 'quote': return children.map(child => `> ${inline(child.children)}\n`).join('');
      case 'list': {
        const ordered = node.fields?.listType === 'number';
        return children.map((child, index) => `${'  '.repeat(depth)}${ordered ? `${index + 1}.` : '-'} ${inline(child.children)}\n${child.children?.filter(grandchild => grandchild.type === 'list').map(grandchild => markdownNodes([grandchild], depth + 1)).join('') ?? ''}`).join('');
      }
      case 'horizontalrule': return '---\n';
      case 'linebreak': return '  \n';
      case 'youtube': {
        const id = node.fields?.videoId;
        const caption = node.fields?.caption;
        return id ? `[YouTube video${typeof caption === 'string' ? `: ${caption}` : ''}](https://www.youtube.com/watch?v=${String(id)})\n` : '';
      }
      case 'upload': return mediaMarker(node);
      case 'block': {
        const type = node.fields?.blockType;
        const id = node.fields?.videoId;
        if (type === 'youtube' && typeof id === 'string' && id) {
          return `[YouTube video](https://www.youtube.com/watch?v=${id})\n`;
        }
        throw new Error(`Unsupported Payload block node: ${typeof type === 'string' ? type : 'unknown'}.`);
      }
      case 'root': return markdownNodes(children, depth);
      default: throw new Error(`Unsupported Payload Lexical node: ${node.type ?? 'unknown'}.`);
    }
  }).join('\n');
}

function tagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map(tag => typeof tag === 'string' ? tag : (tag as { tag?: unknown }).tag).filter((tag): tag is string => typeof tag === 'string');
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalNonnegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function mediaReference(value: unknown, alt?: unknown) {
  const item = typeof value === 'object' && value !== null ? value as Record<string, unknown> : { id: value };
  const id = item.id ?? item.value;
  if (typeof id !== 'string' && typeof id !== 'number') return undefined;
  // Deliberately retain identity and description, never the legacy Payload URL.
  return {
    payloadMediaId: id,
    alt: typeof alt === 'string' ? alt : typeof item.alt === 'string' ? item.alt : undefined,
    filename: typeof item.filename === 'string' ? item.filename : undefined,
  };
}

function collectInlineMedia(nodes: LexicalNode[] = []): Array<ReturnType<typeof mediaReference>> {
  return nodes.flatMap(node => {
    const current = node.type === 'upload' ? [mediaReference(node.fields?.id ?? node.fields?.value ?? node.value, node.fields?.alt)] : [];
    return [...current, ...collectInlineMedia(node.children)];
  });
}

export function convertPayloadEssay(document: PayloadEssayDocument, groupTitle: string): { frontmatter: StaticEssayFrontmatter; markdown: string } {
  const groupSlug = typeof document.group === 'string' ? document.group : document.group.slug;
  if (!groupSlug) throw new Error(`${document.slug}: missing group slug.`);
  const raw = structuredClone(document);
  const inlineMedia = collectInlineMedia(document.content?.root?.children).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const hero = mediaReference((document.meta as { image?: unknown } | undefined)?.image);
  const media = [...inlineMedia, ...(hero ? [hero] : [])].filter((item, index, list) => list.findIndex(other => other?.payloadMediaId === item?.payloadMediaId) === index);
  const frontmatter = staticEssayFrontmatterSchema.parse({
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt ?? '',
    publishedDate: document.publishedDate,
    updatedAt: optionalString(document.updatedAt),
    status: document.publish_status,
    group: { slug: groupSlug, title: typeof document.group === 'object' ? optionalString(document.group.title) ?? groupTitle : groupTitle, order: optionalNonnegativeInteger(document.order), chapter: optionalString(document.chapter) },
    author: optionalString(document.author),
    tags: tagNames(document.tags),
    newsletter: { suppress: Boolean(document.suppressNewsletter), heading: optionalString(document.newsletterHeading), description: optionalString(document.newsletterDescription) },
    discoverability: { canonicalPath: optionalString((document.discoverability as { canonical_path?: unknown } | undefined)?.canonical_path), noIndex: (document.discoverability as { no_index?: unknown } | undefined)?.no_index === true },
    seo: { title: optionalString((document.meta as { title?: unknown } | undefined)?.title), description: optionalString((document.meta as { description?: unknown } | undefined)?.description), hero },
    media,
    source: { payloadId: document.id, payloadUpdatedAt: optionalString(document.updatedAt), sourceHash: sourceHash(raw) },
  });
  const markdown = markdownNodes(document.content?.root?.children).trim() + '\n';
  // js-yaml rejects explicit undefined values; JSON cloning also makes the
  // serialized front matter deterministic for repeatable exports.
  return { frontmatter, markdown: matter.stringify(markdown, JSON.parse(JSON.stringify(frontmatter))) };
}
