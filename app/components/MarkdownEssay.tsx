import Link from 'next/link';

/** Deliberately small, non-executing Markdown renderer for exported essays. */
function textWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^\s)]+\))/g);
  return parts.map((part, index) => {
    const match = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part);
    if (!match) return part;
    const [, label, href] = match;
    const external = /^https?:\/\//.test(href);
    return external
      ? <a key={index} href={href} target="_blank" rel="noreferrer">{label}</a>
      : <Link key={index} href={href}>{label}</Link>;
  });
}

export default function MarkdownEssay({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) nodes.push(<p key={`p-${nodes.length}`}>{textWithLinks(paragraph.join(' '))}</p>);
    paragraph = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const Tag = `h${heading[1].length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      nodes.push(<Tag key={`h-${nodes.length}`}>{textWithLinks(heading[2])}</Tag>);
    } else if (line === '---') {
      flush(); nodes.push(<hr key={`r-${nodes.length}`} />);
    } else if (line.startsWith('> ')) {
      flush(); nodes.push(<blockquote key={`q-${nodes.length}`}>{textWithLinks(line.slice(2))}</blockquote>);
    } else if (/^(?:-|\d+\.)\s+/.test(line)) {
      flush();
      const items: string[] = [];
      const ordered = /^\d+\.\s+/.test(line);
      const itemPattern = ordered ? /^\d+\.\s+/ : /^-\s+/;
      while (index < lines.length && itemPattern.test(lines[index])) {
        items.push(lines[index].replace(itemPattern, ''));
        index += 1;
      }
      index -= 1;
      const List = ordered ? 'ol' : 'ul';
      nodes.push(<List key={`l-${nodes.length}`}>{items.map((item, i) => <li key={i}>{textWithLinks(item)}</li>)}</List>);
    } else if (!line.trim()) flush();
    else paragraph.push(line);
  }
  flush();
  return <div className="prose">{nodes}</div>;
}
