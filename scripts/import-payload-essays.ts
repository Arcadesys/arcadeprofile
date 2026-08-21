/**
 * Read-only Payload -> Markdown essay exporter.
 *
 * Default is a dry run. --write creates a timestamped staging export and raw
 * JSON snapshot. --promote atomically replaces only the selected group after
 * every staged document has passed schema, collision, and media-url checks.
 */
import { createHash } from 'node:crypto';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { convertPayloadEssay, type PayloadEssayDocument } from '../lib/payload-essay-import';
import { classifyPayloadExportFailure, payloadExportHeaders, resolvePayloadExportAuth } from '../lib/payload-export-auth';
import { ESSAY_GROUP_SLUGS } from '../lib/static-essays';

type PayloadResponse<T> = { docs: T[]; page: number; totalPages: number; totalDocs: number };
type PayloadGroup = { slug: string; title: string };

const args = new Set(process.argv.slice(2));
const valueAfter = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const baseUrl = valueAfter('--base-url')?.replace(/\/+$/, '');
const auth = resolvePayloadExportAuth({ credentialFromCli: valueAfter('--token'), schemeFromCli: valueAfter('--auth-scheme') });
const groupFilter = valueAfter('--group');
const shouldWrite = args.has('--write');
const shouldPromote = args.has('--promote');

if (!baseUrl) throw new Error('Usage: npm run export:payload-essays -- --base-url https://example.com [--token TOKEN] [--auth-scheme users-api-key|jwt|bearer|none] [--write --promote]');
if (shouldPromote && !shouldWrite) throw new Error('--promote requires --write so promotion has a fresh staged export.');
if (groupFilter && !ESSAY_GROUP_SLUGS.includes(groupFilter as typeof ESSAY_GROUP_SLUGS[number])) throw new Error(`Unsupported essay group: ${groupFilter}`);

async function fetchAll<T>(collection: string): Promise<T[]> {
  const docs: T[] = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(`${baseUrl}/api/${collection}`);
    url.searchParams.set('depth', '2');
    url.searchParams.set('limit', '100');
    url.searchParams.set('page', String(page));
    const response = await fetch(url, { headers: payloadExportHeaders(auth) });
    if (!response.ok) throw new Error(`Payload ${collection} export failed: ${classifyPayloadExportFailure(response.status)}.`);
    const payload = await response.json() as PayloadResponse<T>;
    docs.push(...payload.docs);
    if (page >= payload.totalPages) return docs;
  }
}

async function main() {
  const [groups, allPosts] = await Promise.all([fetchAll<PayloadGroup>('groups'), fetchAll<PayloadEssayDocument>('posts')]);
  const titles = new Map(groups.map(group => [group.slug, group.title]));
  const selectedGroups = groupFilter ? [groupFilter] : [...ESSAY_GROUP_SLUGS];
  const posts = allPosts.filter(post => {
    const group = typeof post.group === 'string' ? post.group : post.group?.slug;
    return selectedGroups.includes(group as typeof selectedGroups[number]);
  });
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`Slug collision in Payload export: ${post.slug}`);
    seen.add(post.slug);
  }
  // Validate every conversion before the write gate. A dry run is therefore
  // meaningful: unsupported Lexical content or an unresolved upload blocks a
  // later staging export instead of being discovered after files are created.
  const convertedPosts = posts.map(post => {
    const groupSlug = typeof post.group === 'string' ? post.group : post.group?.slug;
    if (!groupSlug) throw new Error(`${post.slug}: missing group`);
    try {
      return { post, groupSlug, converted: convertPayloadEssay(post, titles.get(groupSlug) ?? groupSlug) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${post.slug}: conversion validation failed: ${message}`);
    }
  });
  const exportId = new Date().toISOString().replace(/[:.]/g, '-');
  const root = path.join(process.cwd(), 'content', '_payload-essay-migration');
  const stage = path.join(root, 'staging', exportId);
  const snapshot = { exportedAt: new Date().toISOString(), source: baseUrl, authenticated: auth.scheme !== 'none', groups: selectedGroups, groupsSnapshot: groups, posts };
  console.log(`Inventory: ${posts.length} essay posts across ${selectedGroups.length} writing groups (${auth.scheme === 'none' ? 'public' : 'authenticated'} read; auth=${auth.scheme}; credential-source=${auth.credentialSource}).`);
  if (!shouldWrite) {
    console.log('Dry run only: no snapshot or Markdown files written. Re-run with --write to create a staged export.');
    return;
  }
  await mkdir(stage, { recursive: true });
  await writeFile(path.join(stage, 'source-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
  const manifest = [] as Array<{ slug: string; group: string; payloadId: string; sourceHash: string; file: string }>;
  for (const { converted, groupSlug } of convertedPosts) {
    const directory = path.join(stage, groupSlug);
    await mkdir(directory, { recursive: true });
    const target = path.join(directory, `${converted.frontmatter.slug}.md`);
    await writeFile(target, converted.markdown);
    manifest.push({ slug: converted.frontmatter.slug, group: groupSlug, payloadId: converted.frontmatter.source.payloadId, sourceHash: converted.frontmatter.source.sourceHash, file: path.relative(stage, target) });
  }
  await writeFile(path.join(stage, 'manifest.json'), `${JSON.stringify({ exportId, count: manifest.length, files: manifest }, null, 2)}\n`);
  console.log(`Staged ${manifest.length} essays and the raw source snapshot.`);
  if (!shouldPromote) return;
  for (const group of selectedGroups) {
    const stagedGroup = path.join(stage, group);
    const destination = path.join(process.cwd(), 'content', 'essays', group);
    try { await stat(stagedGroup); } catch { /* group may have zero essays; leave it unpromoted */ continue; }
    const groupFiles = manifest.filter(item => item.group === group);
    if (groupFiles.length === 0) continue;
    await writeFile(path.join(stagedGroup, '_manifest.json'), `${JSON.stringify({ exportId, count: groupFiles.length, sourceSnapshotSha256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), files: groupFiles }, null, 2)}\n`);
    const backup = `${destination}.previous-${exportId}`;
    try { await rename(destination, backup); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(stagedGroup, destination);
  }
  console.log('Promoted complete staged writing groups. Previous exports, if any, remain beside the new group for review.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
