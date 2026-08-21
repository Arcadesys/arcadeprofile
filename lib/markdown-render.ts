function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeHref(value: string): string | null {
  const href = value.trim();
  return /^(?:https?:\/\/|mailto:|\/|#)/i.test(href) ? href : null;
}

function inlineMarkdownToHtml(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, alt: string, src: string) => {
    const safe = safeHref(src);
    return safe ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" />` : escapeHtml(_match);
  });
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, label: string, href: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${escapeHtml(safe)}">${label}</a>` : escapeHtml(_match);
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

/** Convert the intentionally small repository Markdown contract to safe HTML. */
export function markdownToSafeHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${inlineMarkdownToHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const list = /^(\s*)(-|\d+\.)\s+(.+)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
    } else if (heading) {
      flushParagraph();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
    } else if (line === '---') {
      flushParagraph();
      blocks.push('<hr />');
    } else if (line.startsWith('> ')) {
      flushParagraph();
      const quoted: string[] = [];
      while (index < lines.length && lines[index]?.startsWith('> ')) {
        quoted.push((lines[index] ?? '').slice(2));
        index += 1;
      }
      index -= 1;
      blocks.push(`<blockquote><p>${inlineMarkdownToHtml(quoted.join(' '))}</p></blockquote>`);
    } else if (list) {
      flushParagraph();
      const ordered = /\d+\./.test(list[2]);
      const items: string[] = [];
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*-\s+(.+)$/;
      while (index < lines.length) {
        const item = pattern.exec(lines[index] ?? '');
        if (!item) break;
        items.push(`<li>${inlineMarkdownToHtml(item[1])}</li>`);
        index += 1;
      }
      index -= 1;
      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  return blocks.join('\n');
}

export function markdownToPlaintext(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*(?:-|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
