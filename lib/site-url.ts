/** The one public origin used by metadata, feeds, robots, and document headers. */
export const SITE_URL = 'https://www.thearcades.me';

export function absoluteSiteUrl(path = '/'): string {
  return new URL(path, SITE_URL).href;
}
