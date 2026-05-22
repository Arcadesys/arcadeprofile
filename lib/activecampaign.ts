/**
 * ActiveCampaign: one-off list sends via the legacy "action" endpoints
 * (`message_add` + `campaign_create`) exposed under `/api/3/`. The v3 REST
 * `POST /api/3/campaign` shell does not reliably auto-create an underlying
 * message on every account, so the schedule step would fail with no
 * `message_id`. The action endpoints create the message and the scheduled
 * single-send campaign atomically.
 */

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

function getNewsletterListId(): string {
  // Retained for the contact-subscribe path (`syncSubscriberToActiveCampaign`)
  // — the campaign sync flow now passes list ids explicitly via
  // `createScheduledCampaign`.
  const id = firstNonEmpty(
    process.env.AC_NEWSLETTER_LIST_ID,
    process.env.ACTIVECAMPAIGN_LIST_ID,
  );
  if (!id) {
    throw new ActiveCampaignError(
      'Missing AC_NEWSLETTER_LIST_ID or ACTIVECAMPAIGN_LIST_ID environment variable',
    );
  }
  return id;
}

export type Audience = 'all' | 'fiction' | 'essays';

const AUDIENCE_ENV: Record<Audience, string> = {
  all: 'AC_LIST_ID_ALL_PERPOST',
  fiction: 'AC_LIST_ID_FICTION_PERPOST',
  essays: 'AC_LIST_ID_ESSAYS_PERPOST',
};

export function getAudienceListId(audience: Audience): string {
  const name = AUDIENCE_ENV[audience];
  const id = firstNonEmpty(process.env[name]);
  if (!id) {
    throw new ActiveCampaignError(`Missing ${name} environment variable`);
  }
  return id;
}

function getFromName(): string {
  return (
    firstNonEmpty(
      process.env.AC_NEWSLETTER_FROM_NAME,
      process.env.ACTIVECAMPAIGN_FROM_NAME,
    ) || 'Free Play Publishing'
  );
}

function getFromEmail(): string {
  const email = firstNonEmpty(
    process.env.AC_NEWSLETTER_FROM_EMAIL,
    process.env.ACTIVECAMPAIGN_FROM_EMAIL,
    process.env.POSTMARK_FROM_EMAIL,
  );
  if (!email) {
    throw new ActiveCampaignError(
      'Missing newsletter from email: set AC_NEWSLETTER_FROM_EMAIL, ACTIVECAMPAIGN_FROM_EMAIL, or POSTMARK_FROM_EMAIL',
    );
  }
  return email;
}

function getReplyToEmail(): string {
  return (
    firstNonEmpty(
      process.env.AC_NEWSLETTER_REPLY_TO,
      process.env.ACTIVECAMPAIGN_REPLY_TO,
    ) || getFromEmail()
  );
}

/**
 * Formats a date for ActiveCampaign `scheduledDate` (string per API v3).
 * Uses the runtime local timezone; ensure server/AC expectations match in production.
 */
export function formatCampaignSendDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Resolves the instant to send to AC, clamping past times to `now` for API acceptance. */
function resolveAcScheduledSendInstant(scheduledSendAt: Date | undefined, now: Date = new Date()): Date {
  if (!scheduledSendAt) {
    return now;
  }
  if (Number.isNaN(scheduledSendAt.getTime())) {
    return now;
  }
  return scheduledSendAt.getTime() < now.getTime() ? now : scheduledSendAt;
}

function parseNewsletterListIdAsInt(listId: string): number {
  const n = Number.parseInt(listId, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new ActiveCampaignError(
      `Newsletter list id must be a positive integer for API v3 (got: ${listId})`,
    );
  }
  return n;
}

/**
 * Fetch a URL and read the response body within a single timeout window.
 * The previous shape returned the Response and let callers read the body
 * outside the controller's lifetime, so an AC server that sent headers and
 * then stalled on the body would wedge the admin save indefinitely.
 */
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

/**
 * URL-encodes a form key the same way encodeURIComponent does, but leaves
 * `[` and `]` intact. The legacy /admin/api.php parser doesn't urldecode
 * brackets in array keys, so percent-encoding them turns `p[3]` into the
 * literal key `p%5B3%5D` and AC reports the array as empty.
 */
function encodeFormKey(key: string): string {
  return encodeURIComponent(key).replace(/%5B/g, '[').replace(/%5D/g, ']');
}

type AcLegacyResponse = {
  result_code?: number | string;
  result_message?: string;
  result_output?: string;
  id?: number | string;
};

async function postLegacyAction(
  baseUrl: string,
  apiKey: string,
  action: 'message_add' | 'campaign_create' | 'campaign_save',
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<AcLegacyResponse> {
  // ActiveCampaign v3 REST cannot link a message to a campaign — confirmed
  // by AC's own community forum. The legacy `/admin/api.php?api_action=…`
  // actions are the only supported way to schedule a single-send campaign
  // with a message body. Auth is the `api_key` query param; the modern
  // `Api-Token` header isn't honored on this endpoint.
  const query = new URLSearchParams({
    api_action: action,
    api_key: apiKey,
    api_output: 'json',
  });
  const url = `${baseUrl}/admin/api.php?${query.toString()}`;

  // Build the body manually so `[` and `]` in array keys survive transit.
  const body = Object.entries(params)
    .map(([k, v]) => `${encodeFormKey(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const { status, ok, text } = await fetchTextWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  let parsed: AcLegacyResponse & AcV3Errors;
  try {
    parsed = JSON.parse(text) as AcLegacyResponse & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      `ActiveCampaign ${action} returned non-JSON`,
      status,
      text.slice(0, 200),
    );
  }

  // Action endpoints can return HTTP 200 with `result_code: 0` on failure.
  const resultCode = Number(parsed.result_code);
  if (!ok || resultCode !== 1) {
    const detail =
      (typeof parsed.result_message === 'string' && parsed.result_message.trim()) ||
      formatV3ErrorBody(parsed, text.slice(0, 300));
    throw new ActiveCampaignError(
      `ActiveCampaign ${action} failed (${status})`,
      status,
      detail,
    );
  }

  return parsed;
}

/**
 * Looks up an existing AC campaign by exact internal name. Used as a defense
 * in depth before `message_add` / `campaign_create` to avoid duplicate
 * campaigns when the caller's send-record persistence races with AC's
 * acceptance (e.g. process crash between AC OK and Payload write).
 *
 * `filters[name]` on /api/3/campaigns is a contains match in some AC builds,
 * so we filter again by exact equality client-side. `messageId` is best
 * effort — many AC accounts return it as `campaignMessage`/`messageid` on
 * the campaign payload, but the relationship is only guaranteed via the
 * `campaignMessages` join. An empty string is returned if AC doesn't supply
 * it; the caller (per-audience record) treats that as acceptable.
 */
async function findExistingCampaignByName(
  baseUrl: string,
  apiKey: string,
  name: string,
  fetchImpl: typeof fetch,
): Promise<{ messageId: string; campaignId: string } | null> {
  const url =
    `${baseUrl}/api/3/campaigns` +
    `?filters%5Bname%5D=${encodeURIComponent(name)}` +
    `&limit=100`;
  const { status, ok, text } = await fetchTextWithTimeout(
    url,
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

  if (!ok) {
    let parsed: AcV3Errors = {};
    try {
      parsed = JSON.parse(text) as AcV3Errors;
    } catch {
      // fall through
    }
    throw new ActiveCampaignError(
      `ActiveCampaign campaigns lookup failed (${status})`,
      status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }

  let parsed: {
    campaigns?: Array<{
      id?: string | number;
      name?: string;
      messageid?: string | number;
      campaignMessage?: string | number;
    }>;
  };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign campaigns lookup returned non-JSON',
      status,
      text.slice(0, 200),
    );
  }

  const match = (parsed.campaigns ?? []).find((c) => c.name === name);
  if (!match || match.id === undefined || match.id === null) return null;

  const rawMessageId = match.messageid ?? match.campaignMessage;
  return {
    campaignId: String(match.id),
    messageId:
      rawMessageId === undefined || rawMessageId === null
        ? ''
        : String(rawMessageId),
  };
}

async function createMessage(
  baseUrl: string,
  apiKey: string,
  options: {
    subject: string;
    htmlBody: string;
    textBody: string;
    listIdInts: number[];
  },
  fetchImpl: typeof fetch,
): Promise<string> {
  const fromEmail = getFromEmail();
  const params: Record<string, string> = {
    format: 'html',
    fromname: getFromName(),
    fromemail: fromEmail,
    reply2: getReplyToEmail(),
    priority: '3',
    charset: 'utf-8',
    encoding: 'quoted-printable',
    subject: options.subject,
    htmlconstructor: 'editor',
    html: options.htmlBody,
    textconstructor: 'editor',
    text: options.textBody,
  };
  // Multi-list messages get one `p[<id>]=<id>` entry per list. AC dedupes
  // recipients across all lists at send time so a contact on both still
  // receives a single email.
  for (const id of options.listIdInts) {
    params[`p[${id}]`] = String(id);
  }

  const parsed = await postLegacyAction(baseUrl, apiKey, 'message_add', params, fetchImpl);

  const id = parsed.id;
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new ActiveCampaignError(
      'ActiveCampaign message_add response missing id',
      undefined,
      JSON.stringify(parsed).slice(0, 300),
    );
  }
  return String(id);
}

async function createCampaign(
  baseUrl: string,
  apiKey: string,
  options: {
    name: string;
    listIdInts: number[];
    messageId: string;
    scheduledDate: string;
  },
  fetchImpl: typeof fetch,
): Promise<string> {
  const fromEmail = getFromEmail();
  const params: Record<string, string> = {
    type: 'single',
    name: options.name,
    sdate: options.scheduledDate,
    status: '1', // 1 = scheduled
    public: '0',
    tracklinks: 'all',
    tracklinkanalytics: '0',
    trackreads: '1',
    trackreadsanalytics: '0',
    trackreplies: '0',
    analytics_campaign_name: '',
    htmlunsub: '1',
    textunsub: '1',
    htmlunsubdata: '',
    textunsubdata: '',
    segmentid: '0',
    fromname: getFromName(),
    fromemail: fromEmail,
    reply2: getReplyToEmail(),
    priority: '3',
    formid: '0',
    embed_images: '1',
    // Messages: `m[<message_id>]=<send_percentage>`. 100 = single send.
    [`m[${options.messageId}]`]: '100',
  };
  // Lists: `p[<list_id>]=<list_id>` per list. Multiple entries attach the
  // campaign to multiple lists; AC dedupes recipients across them.
  for (const id of options.listIdInts) {
    params[`p[${id}]`] = String(id);
  }

  const parsed = await postLegacyAction(baseUrl, apiKey, 'campaign_create', params, fetchImpl);

  const id = parsed.id;
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign_create response missing id',
      undefined,
      JSON.stringify(parsed).slice(0, 300),
    );
  }
  return String(id);
}

type AcContactSyncResponse = {
  contact?: { id?: number | string };
};

/**
 * Upserts a contact in ActiveCampaign by email and sets their status on the
 * given list. `status: 1` (default) subscribes them; `status: 2` unsubscribes.
 * Used by the public subscribe form to push new signups into AC and to
 * reconcile (unsubscribe from) lists the user didn't pick.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function syncSubscriberToActiveCampaign(options: {
  email: string;
  listIdOverride?: string;
  /** 1 = subscribe (default), 2 = unsubscribe. */
  status?: 1 | 2;
  fetchImpl?: typeof fetch;
}): Promise<{ contactId: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const status = options.status ?? 1;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listId = firstNonEmpty(options.listIdOverride) ?? getNewsletterListId();
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
          contact: Number.parseInt(contactId, 10),
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
    // AC returns 422 when the contact is already subscribed to the list.
    // Re-subscribes are expected (return signups, idempotent backfills),
    // so treat that as success rather than logging noise on every one.
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

export interface CreateScheduledCampaignOptions {
  subject: string;
  htmlBody: string;
  textBody: string;
  /** Used to build the AC internal campaign name (`Blog: <slug>`). Must be
   * stable across saves of the same post so the idempotency lookup matches. */
  slug: string;
  /** Target AC list ids (numeric strings). One campaign attaches to all of
   * them; AC dedupes recipients. Order is preserved in the resulting name
   * suffix only via `slug`, not the list set itself. */
  listIds: string[];
  /** When AC should fire the send. Past times are clamped to `now`. */
  scheduledSendAt?: Date;
  fetchImpl?: typeof fetch;
}

export interface CreateScheduledCampaignResult {
  messageId: string;
  campaignId: string;
  /** The `sdate` value persisted to AC (may be clamped to now). */
  scheduledFor: Date;
  /** The list ids actually attached, in the order they were sent. */
  listIds: string[];
}

/**
 * Provisions a single-send AC campaign targeting one OR MORE lists. AC
 * dedupes recipients across lists, so a contact on both All and Fiction
 * receives one email per campaign — not two.
 *
 * Idempotent on `slug`: a second call with the same slug finds the existing
 * campaign via name lookup and returns its ids without creating a duplicate.
 * It does NOT reschedule the existing campaign — use `updateCampaignSendDate`
 * for that.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function createScheduledCampaign(
  options: CreateScheduledCampaignOptions,
): Promise<CreateScheduledCampaignResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();

  if (options.listIds.length === 0) {
    throw new ActiveCampaignError('createScheduledCampaign requires at least one listId');
  }
  const listIdInts = options.listIds.map(parseNewsletterListIdAsInt);

  const internalName = `Blog: ${options.slug}`.slice(0, 240);
  const sendAt = resolveAcScheduledSendInstant(options.scheduledSendAt);
  const sendDate = formatCampaignSendDate(sendAt);

  const existing = await findExistingCampaignByName(baseUrl, apiKey, internalName, fetchImpl);
  if (existing) {
    return { ...existing, scheduledFor: sendAt, listIds: options.listIds };
  }

  const messageId = await createMessage(
    baseUrl,
    apiKey,
    {
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
      listIdInts,
    },
    fetchImpl,
  );

  const campaignId = await createCampaign(
    baseUrl,
    apiKey,
    {
      name: internalName,
      listIdInts,
      messageId,
      scheduledDate: sendDate,
    },
    fetchImpl,
  );

  return { messageId, campaignId, scheduledFor: sendAt, listIds: options.listIds };
}

/**
 * Updates the scheduled send date of an existing AC campaign via
 * `PUT /api/3/campaigns/:id`. The legacy `campaign_save` action returns
 * "You are not authorized to access this file" against current AC accounts;
 * the v3 endpoint accepts `sdate` changes on already-scheduled campaigns.
 *
 * Past sendAt values are clamped to `now` to mirror create-time behavior.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function updateCampaignSendDate(options: {
  campaignId: string;
  scheduledSendAt: Date;
  fetchImpl?: typeof fetch;
}): Promise<{ scheduledFor: Date }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();

  if (!options.campaignId.trim()) {
    throw new ActiveCampaignError('updateCampaignSendDate requires a non-empty campaignId');
  }

  const sendAt = resolveAcScheduledSendInstant(options.scheduledSendAt);

  const { status, ok, text } = await fetchTextWithTimeout(
    `${baseUrl}/api/3/campaigns/${encodeURIComponent(options.campaignId)}`,
    {
      method: 'PUT',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ campaign: { sdate: sendAt.toISOString() } }),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  if (!ok) {
    let parsed: AcV3Errors = {};
    try {
      parsed = JSON.parse(text) as AcV3Errors;
    } catch {
      // fall through
    }
    throw new ActiveCampaignError(
      `ActiveCampaign PUT campaigns/${options.campaignId} failed (${status})`,
      status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }

  return { scheduledFor: sendAt };
}

/**
 * AC campaign status codes (v3 REST `/api/3/campaigns/:id`):
 *   0 = draft, 1 = scheduled, 2 = sending, 3 = sent,
 *   4 = disabled, 5 = pending, 6 = processing.
 * Anything `>= 2` means the campaign is past the point where rescheduling is
 * safe — `getCampaignStatus` lets the caller detect that and no-op instead.
 */
export type AcCampaignStatusCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export async function getCampaignStatus(options: {
  campaignId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: AcCampaignStatusCode; raw: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();

  if (!options.campaignId.trim()) {
    throw new ActiveCampaignError('getCampaignStatus requires a non-empty campaignId');
  }

  const { status, ok, text } = await fetchTextWithTimeout(
    `${baseUrl}/api/3/campaigns/${encodeURIComponent(options.campaignId)}`,
    {
      method: 'GET',
      headers: { 'Api-Token': apiKey, Accept: 'application/json' },
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  if (!ok) {
    let parsed: AcV3Errors = {};
    try {
      parsed = JSON.parse(text) as AcV3Errors;
    } catch {
      // fall through
    }
    throw new ActiveCampaignError(
      `ActiveCampaign GET campaigns/${options.campaignId} failed (${status})`,
      status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }

  let parsed: { campaign?: { status?: string | number } };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign lookup returned non-JSON',
      status,
      text.slice(0, 200),
    );
  }

  const raw = parsed.campaign?.status;
  const code = Number(raw);
  if (!Number.isFinite(code) || code < 0 || code > 6) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign lookup returned unrecognized status: ${String(raw)}`,
      status,
      text.slice(0, 300),
    );
  }
  return { status: code as AcCampaignStatusCode, raw: String(raw) };
}

/** True when the campaign is past the point where rescheduling is safe.
 * Mirrors the codes >= 2 (sending/sent/disabled/pending/processing). */
export function isCampaignFrozen(status: AcCampaignStatusCode): boolean {
  return status >= 2;
}
