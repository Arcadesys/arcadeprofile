import PostRichText from './PostRichText';
import type { SerializedEditorState } from 'lexical';

export default function LongformBody({ content }: { content: SerializedEditorState }) {
  return (
    <div className="prose">
      <PostRichText data={content} />
    </div>
  );
}
