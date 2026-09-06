/**
 * Remove only a suffix this site generated from a metadata title before adding
 * the current series and site suffixes back exactly once. Page headings remain
 * untouched, so authored punctuation and wording are preserved in the reader.
 */
export function stripGeneratedTitleSuffix(
  title: string,
  seriesTitle: string,
  siteTitle: string,
): string {
  const suffixes = [
    ` | ${seriesTitle} | ${siteTitle}`,
    ` — ${seriesTitle}`,
    ` | ${seriesTitle}`,
    ` | ${siteTitle}`,
  ];
  let normalized = title.trim();
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trimEnd();
      break;
    }
  }
  return normalized;
}
