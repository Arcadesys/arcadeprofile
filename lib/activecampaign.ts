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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
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

  const response = await fetchWithTimeout(
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

  const text = await response.text();
  let parsed: AcLegacyResponse & AcV3Errors;
  try {
    parsed = JSON.parse(text) as AcLegacyResponse & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      `ActiveCampaign ${action} returned non-JSON`,
      response.status,
      text.slice(0, 200),
    );
  }

  // Action endpoints can return HTTP 200 with `result_code: 0` on failure.
  const resultCode = Number(parsed.result_code);
  if (!response.ok || resultCode !== 1) {
    const detail =
      (typeof parsed.result_message === 'string' && parsed.result_message.trim()) ||
      formatV3ErrorBody(parsed, text.slice(0, 300));
    throw new ActiveCampaignError(
      `ActiveCampaign ${action} failed (${response.status})`,
      response.status,
      detail,
    );
  }

  return parsed;
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
 * Upserts a contact in ActiveCampaign by email and subscribes them to the
 * configured newsletter list. Used by the public subscribe form so new
 * signups land in AC, not just in Payload.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function syncSubscriberToActiveCampaign(options: {
  email: string;
  listIdOverride?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ contactId: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listId = firstNonEmpty(options.listIdOverride) ?? getNewsletterListId();
  const listIdInt = parseNewsletterListIdAsInt(listId);

  const syncRes = await fetchWithTimeout(
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

  const syncText = await syncRes.text();
  let syncParsed: AcContactSyncResponse & AcV3Errors;
  try {
    syncParsed = JSON.parse(syncText) as AcContactSyncResponse & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign contact/sync returned non-JSON',
      syncRes.status,
      syncText.slice(0, 200),
    );
  }
  if (!syncRes.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign contact/sync failed (${syncRes.status})`,
      syncRes.status,
      formatV3ErrorBody(syncParsed, syncText.slice(0, 300)),
    );
  }
  const rawId = syncParsed.contact?.id;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    throw new ActiveCampaignError(
      'ActiveCampaign contact/sync response missing contact id',
      syncRes.status,
      syncText.slice(0, 300),
    );
  }
  const contactId = String(rawId);

  const listRes = await fetchWithTimeout(
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
          status: 1,
        },
      }),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );
  const listText = await listRes.text();
  if (!listRes.ok) {
    let listParsed: AcV3Errors = {};
    try {
      listParsed = JSON.parse(listText) as AcV3Errors;
    } catch {
      // fall through to text body
    }
    const errorBody = formatV3ErrorBody(listParsed, listText.slice(0, 300));
    // AC returns 422 when the contact is already subscribed to the list.
    // Re-subscribes are expected (return signups, idempotent backfills),
    // so treat that as success rather than logging noise on every one.
    if (listRes.status === 422 && /already.*(member|subscribed|on.*list)/i.test(errorBody)) {
      return { contactId };
    }
    throw new ActiveCampaignError(
      `ActiveCampaign contactLists failed (${listRes.status})`,
      listRes.status,
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
