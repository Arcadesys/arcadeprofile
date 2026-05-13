/**
 * One-off: migrate active subscribers on the three weekly AC lists onto the
 * matching per-post lists. We're pulling the weekly cadence from the app, but
 * keep the weekly lists themselves dormant in AC so the feature can come back
 * later — this script only ADDS contacts to perpost lists, it does not
 * unsubscribe them from weekly.
 *
 * Usage:
 *   npm run ac:migrate-weekly-to-perpost                # live
 *   npm run ac:migrate-weekly-to-perpost -- --dry-run   # preview only
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const productionEnvPath = resolve(process.cwd(), '.env.production.local');
if (existsSync(productionEnvPath)) {
  loadDotenv({ path: productionEnvPath, override: false });
}

type CliArgs = { dryRun: boolean };

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false };
  for (const a of argv) if (a === '--dry-run') args.dryRun = true;
  return args;
}

function getEnv(name: string, fallbackName?: string): string {
  const v = (process.env[name] || (fallbackName ? process.env[fallbackName] : '') || '').trim();
  if (!v) throw new Error(`Missing env var: ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`);
  return v;
}

const AUDIENCES = ['all', 'fiction', 'essays'] as const;
type Audience = (typeof AUDIENCES)[number];

function lookupWeeklyListId(audience: Audience): string {
  const upper = audience.toUpperCase();
  return getEnv(`AC_LIST_ID_${upper}_WEEKLY`, `AC_LIST_ID_${upper}`);
}

function lookupPerpostListId(audience: Audience): string {
  return getEnv(`AC_LIST_ID_${audience.toUpperCase()}_PERPOST`);
}

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

type ContactListRow = {
  id: string;
  contact: string;
  list: string;
  status: string;
};

async function listSubscribers(
  baseUrl: string,
  apiKey: string,
  listId: string,
): Promise<string[]> {
  const ids: string[] = [];
  const limit = 100;
  let offset = 0;
  // status=1 is "active subscribed" in AC's contactLists representation.
  while (true) {
    const path =
      `/api/3/contactLists?filters%5Blist%5D=${encodeURIComponent(listId)}` +
      `&filters%5Bstatus%5D=1&limit=${limit}&offset=${offset}`;
    const json = (await acFetch(baseUrl, apiKey, path)) as {
      contactLists?: ContactListRow[];
    };
    const rows = json.contactLists ?? [];
    for (const row of rows) ids.push(row.contact);
    if (rows.length < limit) break;
    offset += limit;
  }
  return ids;
}

type AddResult = 'added' | 'already' | 'failed';

async function addContactToList(
  baseUrl: string,
  apiKey: string,
  contactId: string,
  listId: string,
): Promise<AddResult> {
  // POST /api/3/contactLists with status=1 is upsert-like: if the contact is
  // already on the list with status=1, AC returns 200 with the existing row
  // and no fan-out gets triggered. So we can call this unconditionally.
  try {
    const json = (await acFetch(baseUrl, apiKey, '/api/3/contactLists', {
      method: 'POST',
      body: JSON.stringify({
        contactList: { list: listId, contact: contactId, status: 1 },
      }),
    })) as { contactList?: ContactListRow };
    // AC's response doesn't reliably tell us "was this new vs. existing", so
    // we approximate: a freshly-added row is just "added"; we don't try to
    // distinguish "already".
    return json?.contactList ? 'added' : 'failed';
  } catch (err) {
    console.error(`    contact ${contactId} → list ${listId} failed:`, err instanceof Error ? err.message : err);
    return 'failed';
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = getEnv('AC_API_URL', 'ACTIVECAMPAIGN_API_URL');
  const apiKey = getEnv('AC_API_KEY', 'ACTIVECAMPAIGN_API_KEY');

  console.log(args.dryRun ? 'DRY RUN — no AC mutations will be made.' : 'Migrating contacts...');
  console.log('');

  const totals: Record<AddResult, number> = { added: 0, already: 0, failed: 0 };
  for (const audience of AUDIENCES) {
    const weeklyId = lookupWeeklyListId(audience);
    const perpostId = lookupPerpostListId(audience);
    console.log(`[${audience}] weekly=${weeklyId} → perpost=${perpostId}`);

    const contactIds = await listSubscribers(baseUrl, apiKey, weeklyId);
    console.log(`  found ${contactIds.length} active weekly subscriber(s)`);

    if (args.dryRun) {
      console.log(`  would add ${contactIds.length} contact(s) to list ${perpostId}`);
      continue;
    }

    const perAudience: Record<AddResult, number> = { added: 0, already: 0, failed: 0 };
    for (const contactId of contactIds) {
      const result = await addContactToList(baseUrl, apiKey, contactId, perpostId);
      perAudience[result] += 1;
      totals[result] += 1;
    }
    console.log(
      `  added=${perAudience.added} already=${perAudience.already} failed=${perAudience.failed}`,
    );
  }

  if (!args.dryRun) {
    console.log('');
    console.log(`Totals — added=${totals.added} already=${totals.already} failed=${totals.failed}`);
  }
}

main().catch((err) => {
  console.error('\n❌  ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
