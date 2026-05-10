/**
 * Create the three "per-post" cadence lists in ActiveCampaign that the hybrid
 * newsletter cadence (lib/post-newsletter-fanout.ts cadence='perpost') needs
 * to function. Idempotent: if a list with the target name already exists,
 * it's skipped — re-running the script just prints the IDs.
 *
 * Sender info, sender_url, sender_reminder, etc. are copied from an existing
 * "template" list (defaults to AC_LIST_ID_FICTION) so the new lists look
 * like siblings of the weekly variants in AC.
 *
 * Usage:
 *   npm run create-ac-perpost-lists                      # live (creates lists)
 *   npm run create-ac-perpost-lists -- --dry-run         # preview only
 *   npm run create-ac-perpost-lists -- --template-list-id=N
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

type CliArgs = {
  dryRun: boolean;
  templateListId: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, templateListId: null };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--template-list-id=')) {
      args.templateListId = a.slice('--template-list-id='.length);
    }
  }
  return args;
}

function getEnv(name: string, fallbackName?: string): string {
  const v = (process.env[name] || (fallbackName ? process.env[fallbackName] : '') || '').trim();
  if (!v) throw new Error(`Missing env var: ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`);
  return v;
}

function maybeEnv(name: string): string | undefined {
  const v = (process.env[name] || '').trim();
  return v || undefined;
}

const TARGETS: Array<{ name: string; envVar: string; stringid: string }> = [
  { name: 'Fiction — per-post', envVar: 'AC_LIST_ID_FICTION_PERPOST', stringid: 'fiction-perpost' },
  { name: 'Essays — per-post', envVar: 'AC_LIST_ID_ESSAYS_PERPOST', stringid: 'essays-perpost' },
  { name: 'All — per-post', envVar: 'AC_LIST_ID_ALL_PERPOST', stringid: 'all-perpost' },
];

type AcList = {
  id: string;
  name: string;
  stringid?: string;
  sender_url?: string;
  sender_reminder?: string;
  user?: string | number;
  carboncopy?: string;
  subscription_notify?: string;
  unsubscription_notify?: string;
  send_last_broadcast?: string | number;
};

async function acFetch(
  baseUrl: string,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Api-Token': apiKey,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }
  if (!res.ok) {
    throw new Error(
      `AC ${init.method || 'GET'} ${path} failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  return parsed;
}

async function getList(baseUrl: string, apiKey: string, listId: string): Promise<AcList> {
  const json = (await acFetch(baseUrl, apiKey, `/api/3/lists/${encodeURIComponent(listId)}`)) as {
    list?: AcList;
  };
  if (!json?.list) throw new Error(`AC list ${listId} not found`);
  return json.list;
}

async function findListByName(
  baseUrl: string,
  apiKey: string,
  name: string,
): Promise<AcList | null> {
  // AC supports `filters[name]` on list listing. Pull a small page so we
  // don't drag the whole account through.
  const path = `/api/3/lists?filters%5Bname%5D=${encodeURIComponent(name)}&limit=20`;
  const json = (await acFetch(baseUrl, apiKey, path)) as { lists?: AcList[] };
  const exact = json.lists?.find((l) => l.name === name);
  return exact ?? null;
}

async function createList(
  baseUrl: string,
  apiKey: string,
  payload: {
    name: string;
    stringid: string;
    sender_url: string;
    sender_reminder: string;
    user?: string | number;
    carboncopy?: string;
    subscription_notify?: string;
    unsubscription_notify?: string;
    send_last_broadcast?: number;
  },
): Promise<AcList> {
  const json = (await acFetch(baseUrl, apiKey, '/api/3/lists', {
    method: 'POST',
    body: JSON.stringify({ list: payload }),
  })) as { list?: AcList };
  if (!json?.list?.id) throw new Error(`AC list creation returned no id: ${JSON.stringify(json)}`);
  return json.list;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = getEnv('AC_API_URL', 'ACTIVECAMPAIGN_API_URL');
  const apiKey = getEnv('AC_API_KEY', 'ACTIVECAMPAIGN_API_KEY');

  const templateListId =
    args.templateListId ||
    maybeEnv('AC_LIST_ID_FICTION_WEEKLY') ||
    maybeEnv('AC_LIST_ID_FICTION');
  if (!templateListId) {
    throw new Error(
      'No template list id available. Set AC_LIST_ID_FICTION (or pass --template-list-id=<id>).',
    );
  }

  console.log(`Template list: ${templateListId}`);
  const template = await getList(baseUrl, apiKey, templateListId);
  console.log(
    `  → "${template.name}" (sender_url=${template.sender_url ?? '(none)'}, user=${template.user ?? '(none)'})`,
  );
  if (!template.sender_url || !template.sender_reminder) {
    throw new Error(
      'Template list is missing sender_url or sender_reminder — AC requires both on create. Edit the template list in AC, populate those fields, and re-run.',
    );
  }

  console.log('');
  console.log(args.dryRun ? 'DRY RUN — no AC mutations will be made.' : 'Creating lists...');
  console.log('');

  const results: Array<{ envVar: string; id: string; status: 'created' | 'existing' }> = [];
  for (const target of TARGETS) {
    const existing = await findListByName(baseUrl, apiKey, target.name);
    if (existing) {
      console.log(`  ${target.name}: already exists (id=${existing.id}) — skipping`);
      results.push({ envVar: target.envVar, id: existing.id, status: 'existing' });
      continue;
    }
    if (args.dryRun) {
      console.log(`  ${target.name}: would CREATE (stringid=${target.stringid})`);
      results.push({ envVar: target.envVar, id: '(dry-run)', status: 'created' });
      continue;
    }
    const created = await createList(baseUrl, apiKey, {
      name: target.name,
      stringid: target.stringid,
      sender_url: template.sender_url!,
      sender_reminder: template.sender_reminder!,
      user: template.user,
      carboncopy: template.carboncopy,
      subscription_notify: template.subscription_notify,
      unsubscription_notify: template.unsubscription_notify,
      send_last_broadcast: 0,
    });
    console.log(`  ${target.name}: CREATED (id=${created.id})`);
    results.push({ envVar: target.envVar, id: created.id, status: 'created' });
  }

  console.log('');
  console.log('Add these to .env.local and Vercel (production / preview / development):');
  console.log('');
  for (const r of results) {
    console.log(`${r.envVar}=${r.id}`);
  }
  console.log('');
  if (!args.dryRun) {
    console.log(
      'Next: push them to Vercel (see CLAUDE.md → "Syncing env vars to Vercel"),',
    );
    console.log('then re-run `npm run verify:newsletter-fanout` to confirm resolution.');
  }
}

main().catch((err) => {
  console.error('\n❌  ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
