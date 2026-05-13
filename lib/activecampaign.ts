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

export interface SendBlogPostNewsletterOptions {
  /** Email subject line */
  subject: string;
  htmlBody: string;
  textBody: string;
  /** Used for internal campaign name in AC */
  slug: string;
  /**
   * When the list send should be scheduled in ActiveCampaign (maps to
   * `scheduledDate` on the campaign). Typically the post’s `publishedDate`
   * (public go-live). Omitted = send as soon as AC allows (now). If the value
   * is in the past, it is clamped to the current time.
   */
  scheduledSendAt?: Date;
  /**
   * Override the AC list this campaign targets. When set, takes precedence
   * over `AC_NEWSLETTER_LIST_ID` / `ACTIVECAMPAIGN_LIST_ID`. Used by the
   * "Send newsletter preview" admin path so previews go to a test list
   * instead of production subscribers.
   */
  listIdOverride?: string;
  /** Override fetch (tests) */
  fetchImpl?: typeof fetch;
}

export interface SendBlogPostNewsletterResult {
  messageId: string;
  campaignId: string;
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
    ) || 'The Arcades'
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
  action: 'message_add' | 'campaign_create',
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
    listIdInt: number;
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
    // `htmlconstructor: 'external'` tells AC to FETCH the body from an external
    // URL (`htmlfetch`), not "raw HTML provided inline". With no URL set, AC
    // stores a fetch-attempt placeholder (`fetch:`) and that is what subscribers
    // see. Use `'editor'` when providing the HTML directly via the `html` field.
    htmlconstructor: 'editor',
    html: options.htmlBody,
    textconstructor: 'editor',
    text: options.textBody,
    // Associate the message with the target list. AC requires this on
    // message_add, and the same `p[<list_id>]=<list_id>` shape is what the
    // campaign uses too.
    [`p[${options.listIdInt}]`]: String(options.listIdInt),
  };

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
    listIdInt: number;
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
    // Lists go under `p[<list_id>]=<list_id>` (NOT `list[<list_id>]`).
    // AC's `campaign_create` example shows `p[1]=1` for list association.
    // Sending `list[…]` instead returns "You did not provide any lists."
    [`p[${options.listIdInt}]`]: String(options.listIdInt),
    // Messages: `m[<message_id>]=<send_percentage>`. 100 = single send.
    [`m[${options.messageId}]`]: '100',
  };

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

/**
 * Creates a single-send campaign in ActiveCampaign by posting to the legacy
 * `/admin/api.php` action endpoints. The v3 REST API cannot link a message
 * to a campaign (confirmed by AC's own community forum), so the legacy
 * `message_add` + `campaign_create` actions are the only supported path.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function sendBlogPostNewsletter(
  options: SendBlogPostNewsletterOptions,
): Promise<SendBlogPostNewsletterResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listId = firstNonEmpty(options.listIdOverride) ?? getNewsletterListId();
  const listIdInt = parseNewsletterListIdAsInt(listId);

  const internalName = `Blog: ${options.slug}`.slice(0, 240);
  const sendAt = resolveAcScheduledSendInstant(options.scheduledSendAt);
  const sendDate = formatCampaignSendDate(sendAt);

  // Idempotency safety net: if AC already has a campaign with this exact name
  // (Payload caller crashed between AC OK and DB write, or two concurrent
  // hooks raced), return its ids instead of creating a duplicate.
  const existing = await findExistingCampaignByName(baseUrl, apiKey, internalName, fetchImpl);
  if (existing) {
    return existing;
  }

  const messageId = await createMessage(
    baseUrl,
    apiKey,
    {
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
      listIdInt,
    },
    fetchImpl,
  );

  const campaignId = await createCampaign(
    baseUrl,
    apiKey,
    {
      name: internalName,
      listIdInt,
      messageId,
      scheduledDate: sendDate,
    },
    fetchImpl,
  );

  return { messageId, campaignId };
}
