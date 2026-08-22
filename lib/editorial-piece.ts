import type { SerializedEditorState } from 'lexical';

import type { BlogPost } from '@/lib/blog';
import type { CollectionStory } from '@/lib/collection';

export type EditorialBlock =
  | { type: 'heading'; text: string; level: 2 | 3 | 4 }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[]; ordered: boolean };

/** Source-neutral public editorial representation. Keep web text canonical. */
export interface EditorialPiece {
  id: string;
  kind: 'post' | 'story' | 'lab';
  title: string;
  description: string;
  author: string;
  datePublished?: string;
  dateModified?: string;
  canonicalPath: string;
  pdfPath: string;
  section?: string;
  image?: { src: string; alt: string };
  pdfOverrideUrl?: string;
  blocks: EditorialBlock[];
}

function cleanInline(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function markdownToEditorialBlocks(markdown: string): EditorialBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: EditorialBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    const text = cleanInline(paragraph.join(' '));
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const list = /^(\s*)(-|\d+\.)\s+(.+)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: Math.min(4, Math.max(2, heading[1].length)) as 2 | 3 | 4, text: cleanInline(heading[2]) });
      continue;
    }
    if (line.startsWith('> ')) {
      flush();
      blocks.push({ type: 'quote', text: cleanInline(line.slice(2)) });
      continue;
    }
    if (list) {
      flush();
      const ordered = /\d+\./.test(list[2]);
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*-\s+(.+)$/;
      const items: string[] = [];
      while (index < lines.length) {
        const item = pattern.exec(lines[index] ?? '');
        if (!item) break;
        items.push(cleanInline(item[1]));
        index += 1;
      }
      index -= 1;
      if (items.length) blocks.push({ type: 'list', ordered, items });
      continue;
    }
    if (line !== '---') paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

function lexicalNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const value = node as { text?: unknown; children?: unknown[] };
  const own = typeof value.text === 'string' ? value.text : '';
  const children = Array.isArray(value.children) ? value.children.map(lexicalNodeText).join('') : '';
  return `${own}${children}`.replace(/\s+/g, ' ').trim();
}

export function lexicalToEditorialBlocks(content: SerializedEditorState): EditorialBlock[] {
  const root = content?.root as { children?: unknown[] } | undefined;
  const blocks: EditorialBlock[] = [];
  for (const node of root?.children ?? []) {
    const item = node as { type?: string; tag?: string; children?: unknown[] };
    const text = lexicalNodeText(item);
    if (!text) continue;
    if (item.type === 'list') {
      const items = (item.children ?? []).map(lexicalNodeText).filter(Boolean);
      if (items.length) blocks.push({ type: 'list', ordered: item.tag === 'ol', items });
      continue;
    }
    if (item.type === 'quote') { blocks.push({ type: 'quote', text }); continue; }
    if (item.type === 'heading') {
      const tag = Number(String(item.tag ?? 'h2').replace('h', ''));
      blocks.push({ type: 'heading', level: Math.min(4, Math.max(2, tag)) as 2 | 3 | 4, text });
      continue;
    }
    blocks.push({ type: 'paragraph', text });
  }
  return blocks;
}

export function blogPostToEditorialPiece(post: BlogPost, groupTitle?: string): EditorialPiece {
  const canonicalPath = `/projects/${post.group}/${post.slug}`;
  return {
    id: `post:${post.id}`,
    kind: 'post',
    title: post.title,
    description: post.meta?.description || post.excerpt,
    author: post.author || 'Austen Tucker',
    datePublished: post.date,
    dateModified: post.updatedDate,
    canonicalPath,
    pdfPath: `${canonicalPath}/pdf`,
    section: groupTitle ?? post.group,
    image: post.hero,
    pdfOverrideUrl: post.pdfOverrideUrl,
    blocks: post.markdownBody ? markdownToEditorialBlocks(post.markdownBody) : lexicalToEditorialBlocks(post.content!),
  };
}

export function collectionStoryToEditorialPiece(story: CollectionStory): EditorialPiece {
  const canonicalPath = `/this-is-what-i-do-for-fun/${story.slug}`;
  return {
    id: `collection:${story.slug}`,
    kind: 'story',
    title: story.title,
    description: story.description,
    author: 'Austen Tucker',
    canonicalPath,
    pdfPath: `${canonicalPath}/pdf`,
    section: 'This is what I do for fun',
    image: { src: story.cover.src, alt: story.coverAlt },
    pdfOverrideUrl: story.downloads.pdf,
    blocks: story.content ? lexicalToEditorialBlocks(story.content) : [{ type: 'paragraph', text: story.description }],
  };
}
