import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import { $convertFromMarkdownString, TRANSFORMERS } from '@payloadcms/richtext-lexical/lexical/markdown';
import { getEnabledNodes, editorConfigFactory } from '@payloadcms/richtext-lexical';
import type { Klass, LexicalNode, LexicalNodeReplacement } from 'lexical';

let cachedNodes: Array<Klass<LexicalNode> | LexicalNodeReplacement> | null = null;

async function getEditorNodes() {
  if (cachedNodes) return cachedNodes;
  const payload = await getPayload({ config });
  const sanitizedConfig = await payload.config;
  const editorConfig = await editorConfigFactory.default({ config: sanitizedConfig });
  cachedNodes = getEnabledNodes({ editorConfig });
  return cachedNodes;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.markdown || typeof body.markdown !== 'string') {
    return NextResponse.json({ error: 'markdown field required' }, { status: 400 });
  }

  const nodes = await getEditorNodes();
  const editor = createHeadlessEditor({ nodes });
  editor.update(
    () => {
      $convertFromMarkdownString(body.markdown, TRANSFORMERS);
    },
    { discrete: true },
  );
  const lexical = editor.getEditorState().toJSON();
  return NextResponse.json({ lexical });
}
