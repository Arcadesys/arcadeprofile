import type { Payload } from 'payload';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import {
  $convertFromMarkdownString,
  TRANSFORMERS,
} from '@payloadcms/richtext-lexical/lexical/markdown';
import {
  getEnabledNodes,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical';

export async function createMarkdownToLexical(
  payload: Payload,
): Promise<(markdown: string) => SerializedEditorState> {
  const sanitizedConfig = await payload.config;
  const editorConfig = await editorConfigFactory.default({ config: sanitizedConfig });
  const nodes = getEnabledNodes({ editorConfig });

  return (markdown: string): SerializedEditorState => {
    const editor = createHeadlessEditor({ nodes });
    editor.update(
      () => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      },
      { discrete: true },
    );
    return editor.getEditorState().toJSON() as SerializedEditorState;
  };
}
