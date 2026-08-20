/**
 * ActiveCampaign helpers. AC remains the subscriber/list source of truth;
 * Postmark handles newsletter delivery.
 */

import { parsePositiveIntegerId as parsePositiveIntegerIdValue } from '@/lib/positive-integer-id';
import type { Audience } from '@/lib/subscribe-types';

const REQUEST_TIMEOUT_MS = 15_000;

export class ActiveCampaignError extends Error {
  constructor(
    message: string,
    public readonly causeStatus?: number,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'ActiveCampaignError';
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

function getApiBaseUrl(): string {
  const raw = firstNonEmpty(process.env.AC_API_URL, process.env.ACTIVECAMPAIGN_API_URL);
  if (!raw) {
    throw new ActiveCampaignError(
      'Missing AC_API_URL or ACTIVECAMPAIGN_API_URL environment variable',
    );
  }
  return raw.replace(/\/+$/, '');
}

function getApiKey(): string {
  const key = firstNonEmpty(process.env.AC_API_KEY, process.env.ACTIVECAMPAIGN_API_KEY);
  if (!key) {
    throw new ActiveCampaignError(
      'Missing AC_API_KEY or ACTIVECAMPAIGN_API_KEY environment variable',
    );
  }
  return key;
}

const AUDIENCE_ENV: Record<Audience, string> = {
  all: 'AC_LIST_ID_ALL_PERPOST',
  fiction: 'AC_LIST_ID_FICTION_PERPOST',
  essays: 'AC_LIST_ID_ESSAYS_PERPOST',
  lab: 'AC_LIST_ID_LAB_PERPOST',
};

export function getAudienceListId(audience: Audience): string {
  const name = AUDIENCE_ENV[audience];
  const id = firstNonEmpty(process.env[name]);
  if (!id) {
    throw new ActiveCampaignError(`Missing ${name} environment variable`);
  }
  return id;
}

export function resolveAudienceListIds(groupCategory: string | null): string[] {
  const secondary = groupCategory === 'fiction' ? 'fiction' : 'essays';
  return [getAudienceListId('all'), getAudienceListId(secondary)];
}

function parsePositiveIntegerId(value: string, label: string): number {
  const n = parsePositiveIntegerIdValue(value);
  if (n === null) {
    throw new ActiveCampaignError(`${label} must be a positive integer for API v3 (got: ${value})`);
  }
  return n;
}

function parseNewsletterListIdAsInt(listId: string): number {
  return parsePositiveIntegerId(listId, 'Newsletter list id');
}

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ status: number; ok: boolean; text: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return { status: response.status, ok: response.ok, text };
  } finally {
    clearTimeout(timeoutId);
  }
}

type AcV3Errors = {
  errors?: Array<{ title?: string; detail?: string } | string>;
  message?: string;
};

function formatV3ErrorBody(parsed: AcV3Errors, fallback: string): string {
  if (typeof parsed.message === 'string' && parsed.message.trim()) {
    return parsed.message.trim();
  }
  if (!parsed.errors?.length) return fallback;
  return parsed.errors
    .map((e) => (typeof e === 'string' ? e : e.detail || e.title))
    .filter(Boolean)
    .join('; ');
}

type AcContactsListResponse = {
  contacts?: Array<{ email?: string | null }>;
  meta?: { total?: string | number };
};

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function listActiveContactsForList(options: {
  listId: string;
  fetchImpl?: typeof fetch;
  limit?: number;
}): Promise<string[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listIdInt = parseNewsletterListIdAsInt(options.listId);
  const limit = options.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new ActiveCampaignError('ActiveCampaign contacts page limit must be a positive integer');
  }
  const emails: string[] = [];
  let offset = 0;

  while (true) {
    const query = new URLSearchParams({
      listid: String(listIdInt),
      status: '1',
      limit: String(limit),
      offset: String(offset),
    });
    const { status, ok, text } = await fetchTextWithTimeout(
      `${baseUrl}/api/3/contacts?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          'Api-Token': apiKey,
          Accept: 'application/json',
        },
      },
      fetchImpl,
      REQUEST_TIMEOUT_MS,
    );

    let parsed: AcContactsListResponse & AcV3Errors;
    try {
      parsed = JSON.parse(text) as AcContactsListResponse & AcV3Errors;
    } catch {
      throw new ActiveCampaignError(
        'ActiveCampaign contacts lookup returned non-JSON',
        status,
        text.slice(0, 200),
      );
    }

    if (!ok) {
      throw new ActiveCampaignError(
        `ActiveCampaign contacts lookup failed (${status})`,
        status,
        formatV3ErrorBody(parsed, text.slice(0, 300)),
      );
    }

    const contacts = parsed.contacts ?? [];
    for (const contact of contacts) {
      const email = contact.email?.trim().toLowerCase();
      if (email && isLikelyEmail(email)) emails.push(email);
    }

    offset += contacts.length;
    const total = Number(parsed.meta?.total);
    if (contacts.length === 0) break;
    if (Number.isFinite(total) && offset >= total) break;
    if (contacts.length < limit) break;
  }

  return emails;
}

export async function resolveActiveCampaignRecipientsForLists(options: {
  listIds: string[];
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const seen = new Set<string>();
  const lists = await Promise.all(
    options.listIds.map((listId) => listActiveContactsForList({
      listId,
      fetchImpl: options.fetchImpl,
    })),
  );
  for (const emails of lists) {
    for (const email of emails) seen.add(email);
  }
  return [...seen].sort();
}

type AcContactSyncResponse = {
  contact?: { id?: number | string };
};

/**
 * Upserts a contact in ActiveCampaign by email and sets their status on the
 * given list. `status: 1` subscribes them; `status: 2` unsubscribes.
 */
export async function syncSubscriberToActiveCampaign(options: {
  email: string;
  listId: string;
  status?: 1 | 2;
  fetchImpl?: typeof fetch;
}): Promise<{ contactId: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const status = options.status ?? 1;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listId = firstNonEmpty(options.listId);
  if (!listId) {
    throw new ActiveCampaignError('ActiveCampaign list id is required');
  }
  const listIdInt = parseNewsletterListIdAsInt(listId);

  const sync = await fetchTextWithTimeout(
    `${baseUrl}/api/3/contact/sync`,
    {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ contact: { email: options.email } }),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  let syncParsed: AcContactSyncResponse & AcV3Errors;
  try {
    syncParsed = JSON.parse(sync.text) as AcContactSyncResponse & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign contact/sync returned non-JSON',
      sync.status,
      sync.text.slice(0, 200),
    );
  }
  if (!sync.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign contact/sync failed (${sync.status})`,
      sync.status,
      formatV3ErrorBody(syncParsed, sync.text.slice(0, 300)),
    );
  }
  const rawId = syncParsed.contact?.id;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    throw new ActiveCampaignError(
      'ActiveCampaign contact/sync response missing contact id',
      sync.status,
      sync.text.slice(0, 300),
    );
  }
  const contactId = String(rawId);
  const contactIdInt = parsePositiveIntegerId(contactId, 'ActiveCampaign contact id');

  const list = await fetchTextWithTimeout(
    `${baseUrl}/api/3/contactLists`,
    {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        contactList: {
          list: listIdInt,
          contact: contactIdInt,
          status,
        },
      }),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );
  if (!list.ok) {
    let listParsed: AcV3Errors = {};
    try {
      listParsed = JSON.parse(list.text) as AcV3Errors;
    } catch {
      // fall through to text body
    }
    const errorBody = formatV3ErrorBody(listParsed, list.text.slice(0, 300));
    if (list.status === 422 && /already.*(member|subscribed|on.*list)/i.test(errorBody)) {
      return { contactId };
    }
    throw new ActiveCampaignError(
      `ActiveCampaign contactLists failed (${list.status})`,
      list.status,
      errorBody,
    );
  }

  return { contactId };
}
