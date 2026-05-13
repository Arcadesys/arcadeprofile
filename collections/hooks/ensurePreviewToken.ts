import { generatePreviewToken, isPreviewToken } from '../../lib/preview-token';

// Stamp a preview token on first save and leave existing tokens alone.
// Stable tokens mean previously-shared preview URLs keep resolving forever,
// even after edits or status changes.
export function ensurePreviewTokenHook<T extends Record<string, any> | undefined>(
  args: { data: T },
): T {
  const { data } = args;
  if (data && !isPreviewToken(data.previewToken)) {
    data.previewToken = generatePreviewToken();
  }
  return data;
}
