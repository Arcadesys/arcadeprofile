import { markdownToSafeHtml } from '@/lib/markdown-render';

/** Repository Markdown is escaped and converted by the small safe renderer. */
export default function MarkdownPostBody({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(markdown) }}
    />
  );
}
