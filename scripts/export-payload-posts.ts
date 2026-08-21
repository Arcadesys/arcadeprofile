/** Read-only Payload REST inventory plus a dry-run-by-default staging exporter. */
import { collectPayloadPages, exportPayloadPosts, type PayloadGroup, type PayloadPost } from '../lib/payload-markdown-export';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const baseUrl = option('--base-url')?.replace(/\/+$/, '');
const token = option('--token') ?? process.env.PAYLOAD_EXPORT_TOKEN;
const stagingDirectory = option('--staging-dir');
const write = process.argv.includes('--write');

if (!baseUrl) throw new Error('Usage: npm run export:payload-posts -- --base-url https://example.test [--token TOKEN] [--write --staging-dir /absolute/staging/path]');
if (write && !stagingDirectory) throw new Error('--write requires an explicit --staging-dir; canonical content/posts is never a target.');
if (!write && stagingDirectory) throw new Error('--staging-dir requires --write. The default is a no-write dry run.');

async function fetchAll<T>(collection: string): Promise<T[]> {
  return collectPayloadPages(async (page) => {
    const url = new URL(`${baseUrl}/api/${collection}`);
    url.searchParams.set('depth', '2');
    url.searchParams.set('limit', '100');
    url.searchParams.set('page', String(page));
    const response = await fetch(url, { headers: token ? { Authorization: `JWT ${token}` } : undefined });
    if (!response.ok) throw new Error(`Payload ${collection} inventory failed: ${response.status} ${response.statusText}`);
    return await response.json() as { docs?: T[]; page?: number; totalPages?: number };
  });
}

async function main(): Promise<void> {
  const [groups, posts] = await Promise.all([fetchAll<PayloadGroup>('groups'), fetchAll<PayloadPost>('posts')]);
  // Do not print the token or documents: reports retain hashes and safe metadata only.
  await exportPayloadPosts({ posts, groups, dryRun: !write, ...(write ? { stagingDirectory } : {}) });
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Payload export failed'); process.exitCode = 1; });
