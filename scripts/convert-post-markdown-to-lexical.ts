/**
 * One-shot repair: convert a post whose `content` was saved as raw markdown
 * (inside Lexical text nodes) into a proper Lexical doc, so headings,
 * emphasis, blockquotes, etc. render through the existing prose pipeline.
 *
 * Usage:
 *   tsx --require ./scripts/patch-next-env.cjs scripts/convert-post-markdown-to-lexical.ts <slug>
 *
 * Defaults to slug `carl` if no argument is provided. Idempotent in practice:
 * re-running on already-clean Lexical content concatenates the rendered text
 * back into markdown, but headings/styles will already match — diff before
 * applying if unsure.
 */
import { getPayload } from 'payload';
import configPromise from '../payload.config';
import { createMarkdownToLexical } from './lib/markdown-to-lexical';

interface LexicalNode {
  type?: string;
  text?: string;
  children?: LexicalNode[];
}

function extractMarkdown(node: LexicalNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.children)) return '';

  // Block-level nodes get separated by a blank line so paragraph structure
  // survives the round-trip; inline nodes concatenate.
  const blockTypes = new Set([
    'paragraph',
    'heading',
    'quote',
    'list',
    'listitem',
    'code',
    'horizontalrule',
  ]);

  const parts: string[] = [];
  for (const child of node.children) {
    const rendered = extractMarkdown(child);
    if (!rendered && child.type !== 'horizontalrule') continue;
    if (child.type && blockTypes.has(child.type)) {
      parts.push(rendered);
    } else {
      // inline — append to the last block, or start a new one
      if (parts.length === 0) parts.push(rendered);
      else parts[parts.length - 1] += rendered;
    }
  }
  return parts.join('\n\n');
}

async function main() {
  const slug = (process.argv[2] || 'carl').trim();
  if (!slug) throw new Error('Usage: convert-post-markdown-to-lexical.ts <slug>');

  const payload = await getPayload({ config: configPromise });
  const found = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const post = found.docs[0];
  if (!post) {
    console.error(`No post with slug "${slug}".`);
    process.exit(1);
  }

  const root = (post.content as { root?: LexicalNode } | null)?.root;
  const markdown = extractMarkdown(root).trim();
  if (!markdown) {
    console.error(`Post "${slug}" has no extractable text in content.root.`);
    process.exit(1);
  }

  const before = JSON.stringify(post.content).length;
  console.log(`[convert] slug=${slug} extracted markdown bytes=${markdown.length}`);

  const toLexical = await createMarkdownToLexical(payload);
  const lexical = toLexical(markdown);

  await payload.update({
    collection: 'posts',
    id: post.id,
    data: { content: lexical as unknown as Record<string, unknown> },
    overrideAccess: true,
  });

  const after = JSON.stringify(lexical).length;
  console.log(`[convert] slug=${slug} content bytes ${before} -> ${after}. Done.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
