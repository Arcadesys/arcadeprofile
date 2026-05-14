import type { ReactElement } from 'react';

/**
 * Render a JSON-LD <script> tag with the given object.
 *
 * `</script>` inside JSON would break out of the tag; escape it so a stray
 * string in user content can never close the script element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactElement {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
