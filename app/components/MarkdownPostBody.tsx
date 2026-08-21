import { markdownToSafeHtml } from '@/lib/markdown-render';

/** Repository Markdown is escaped and converted by the small safe renderer. */
export default function MarkdownPostBody({ markdown }: { markdown: string }) {
  // The page shell owns the single h1. Preserve authored hierarchy below it.
  const articleBody = markdown.replace(/^# (.+)$/gm, '## $1');
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(articleBody) }}
    />
  );
}
