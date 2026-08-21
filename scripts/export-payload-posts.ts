/** Read-only Payload REST inventory plus a dry-run-by-default staging exporter. */
import { collectPayloadPages, exportPayloadPosts, type PayloadGroup, type PayloadPost } from '../lib/payload-markdown-export';
import { classifyPayloadExportFailure, payloadExportHeaders, payloadMeResponseIsAuthenticated, resolvePayloadExportAuth } from '../lib/payload-export-auth';
import mediaAltById from '../data/payload-media-alt.json';
import mediaUrlById from '../data/payload-media-url.json';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const baseUrl = option('--base-url')?.replace(/\/+$/, '');
const auth = resolvePayloadExportAuth({
  credentialFromCli: option('--token'),
  schemeFromCli: option('--auth-scheme'),
});
const stagingDirectory = option('--staging-dir');
const write = process.argv.includes('--write');

if (!baseUrl) throw new Error('Usage: npm run export:payload-posts -- --base-url https://example.test [--token TOKEN --auth-scheme users-api-key|jwt|bearer] [--write --staging-dir /absolute/staging/path]');
if (write && !stagingDirectory) throw new Error('--write requires an explicit --staging-dir; canonical content/posts is never a target.');
if (!write && stagingDirectory) throw new Error('--staging-dir requires --write. The default is a no-write dry run.');

async function fetchAll<T>(collection: string): Promise<T[]> {
  return collectPayloadPages(async (page) => {
    const url = new URL(`${baseUrl}/api/${collection}`);
    url.searchParams.set('depth', '2');
    url.searchParams.set('limit', '100');
    url.searchParams.set('page', String(page));
    const response = await fetch(url, { headers: payloadExportHeaders(auth) });
    if (!response.ok) throw new Error(`Payload ${collection} inventory failed: ${classifyPayloadExportFailure(response.status)}`);
    return await response.json() as { docs?: T[]; page?: number; totalPages?: number };
  });
}

async function assertCredentialIsAuthenticated(): Promise<void> {
  if (auth.scheme === 'none') return;
  const response = await fetch(`${baseUrl}/api/users/me`, { headers: payloadExportHeaders(auth) });
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(`Payload authentication check failed: ${classifyPayloadExportFailure(response.status)}`);
  if (!payloadMeResponseIsAuthenticated(body)) {
    throw new Error('Payload export credential was not recognized; refusing to label an anonymous inventory as authenticated.');
  }
}

async function main(): Promise<void> {
  await assertCredentialIsAuthenticated();
  const [groups, posts] = await Promise.all([fetchAll<PayloadGroup>('groups'), fetchAll<PayloadPost>('posts')]);
  // Do not print the token or documents: reports retain hashes and safe metadata only.
  await exportPayloadPosts({ posts, groups, mediaAltById, mediaUrlById, dryRun: !write, ...(write ? { stagingDirectory } : {}) });
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Payload export failed'); process.exitCode = 1; });
