/**
 * Extracts plain text from Lexical editor JSON state.
 * Used for feeding content to AI APIs and similar text-only consumers.
 */
export function lexicalToPlainText(data: Record<string, unknown>): string {
  if (!data || !data.root) return '';

  const lines: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (typeof node.text === 'string') {
      lines.push(node.text);
      return;
    }

    if (node.type === 'linebreak') {
      lines.push('\n');
      return;
    }

    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      for (const child of children) {
        walk(child);
      }
      // Add newline after block-level elements
      if (
        node.type === 'paragraph' ||
        node.type === 'heading' ||
        node.type === 'listitem' ||
        node.type === 'quote'
      ) {
        lines.push('\n');
      }
    }
  }

  walk(data.root as Record<string, unknown>);
  return lines.join('').trim();
}
