import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { editorConfigFactory, getEnabledNodes } from '@payloadcms/richtext-lexical';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import { $convertFromMarkdownString } from '@payloadcms/richtext-lexical/lexical/markdown';

const YT_URL_LINE_RE =
  /^[ \t]*https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=([\w-]{11})|embed\/([\w-]{11})|shorts\/([\w-]{11}))|youtu\.be\/([\w-]{11}))[^\s]*[ \t]*$/;

function preprocessMarkdown(input: string): string {
  return input
    .split('\n')
    .map((line) => {
      const m = YT_URL_LINE_RE.exec(line);
      if (!m) return line;
      const id = m[1] || m[2] || m[3] || m[4];
      return `<YouTube id="${id}"/>`;
    })
    .join('\n');
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const apiKey = process.env.PAYLOAD_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.markdown || typeof body.markdown !== 'string') {
    return NextResponse.json({ error: 'markdown field required' }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const postsCollection = payload.config.collections.find((c) => c.slug === 'posts');
  const contentField = postsCollection?.fields.find(
    (f) => 'name' in f && f.name === 'content',
  );
  if (!contentField || !('editor' in contentField) || !contentField.editor) {
    return NextResponse.json({ error: 'posts.content editor not found' }, { status: 500 });
  }
  const editorConfig = editorConfigFactory.fromField({
    field: contentField as Parameters<typeof editorConfigFactory.fromField>[0]['field'],
  });
  const editor = createHeadlessEditor({ nodes: getEnabledNodes({ editorConfig }) });
  editor.update(
    () => {
      $convertFromMarkdownString(
        preprocessMarkdown(body.markdown),
        editorConfig.features.markdownTransformers,
      );
    },
    { discrete: true },
  );
  const lexical = editor.getEditorState().toJSON();
  return NextResponse.json({ lexical });
}
