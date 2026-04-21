/**
 * ActiveCampaign: one-off list sends via API v3 — create campaign shell,
 * populate the campaign’s message, then schedule with list + send time.
 */

const REQUEST_TIMEOUT_MS = 60_000;

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

function formatCampaignSendDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

async function createCampaignShellV3(
  baseUrl: string,
  apiKey: string,
  name: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const url = `${baseUrl}/api/3/campaign`;
  const body = {
    type: 'single',
    name,
    canSplitContent: false,
  };

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  const text = await response.text();
  let parsed: { id?: number } & AcV3Errors;
  try {
    parsed = JSON.parse(text) as { id?: number } & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign API v3 returned non-JSON when creating campaign',
      response.status,
      text.slice(0, 200),
    );
  }

  if (!response.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign create failed (${response.status})`,
      response.status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }

  const id = parsed.id;
  if (id === undefined || id === null) {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign create response missing id',
      response.status,
      text.slice(0, 300),
    );
  }

  return String(id);
}

type AcV3CampaignRecord = {
  message_id?: string;
  addressid?: string;
};

async function getCampaignV3(
  baseUrl: string,
  apiKey: string,
  campaignId: string,
  fetchImpl: typeof fetch,
): Promise<AcV3CampaignRecord> {
  const url = `${baseUrl}/api/3/campaigns/${campaignId}`;
  const response = await fetchWithTimeout(
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

  const text = await response.text();
  let parsed: { campaign?: AcV3CampaignRecord } & AcV3Errors;
  try {
    parsed = JSON.parse(text) as { campaign?: AcV3CampaignRecord } & AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign API v3 returned non-JSON when loading campaign',
      response.status,
      text.slice(0, 200),
    );
  }

  if (!response.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign get failed (${response.status})`,
      response.status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }

  const campaign = parsed.campaign;
  if (!campaign) {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign get response missing campaign',
      response.status,
      text.slice(0, 300),
    );
  }

  return campaign;
}

function buildMessagePayload(options: { subject: string; htmlBody: string; textBody: string }) {
  const fromEmail = getFromEmail();
  return {
    fromname: getFromName(),
    email: fromEmail,
    fromemail: fromEmail,
    reply2: getReplyToEmail(),
    subject: options.subject,
    html: options.htmlBody,
    text: options.textBody,
  };
}

async function updateMessageV3(
  baseUrl: string,
  apiKey: string,
  messageId: string,
  options: { subject: string; htmlBody: string; textBody: string },
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = `${baseUrl}/api/3/messages/${encodeURIComponent(messageId)}`;
  const body = { message: buildMessagePayload(options) };

  const response = await fetchWithTimeout(
    url,
    {
      method: 'PUT',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  const text = await response.text();
  let parsed: AcV3Errors;
  try {
    parsed = JSON.parse(text) as AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign API v3 returned non-JSON when updating message',
      response.status,
      text.slice(0, 200),
    );
  }

  if (!response.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign message update failed (${response.status})`,
      response.status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }
}

async function scheduleCampaignEditV3(
  baseUrl: string,
  apiKey: string,
  campaignId: string,
  options: {
    listIdInt: number;
    scheduledDate: string;
    addressId?: number;
  },
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = `${baseUrl}/api/3/campaigns/${encodeURIComponent(campaignId)}/edit`;
  const body: Record<string, unknown> = {
    segmentId: '0',
    listIds: [options.listIdInt],
    scheduledDate: options.scheduledDate,
    readTrackingEnabled: true,
    linkTrackingEnabled: true,
    replyTrackingEnabled: false,
    publicCampaignArchive: false,
  };
  if (options.addressId !== undefined) {
    body.addressId = options.addressId;
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: 'PUT',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  const text = await response.text();
  let parsed: AcV3Errors;
  try {
    parsed = JSON.parse(text) as AcV3Errors;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign API v3 returned non-JSON when scheduling campaign',
      response.status,
      text.slice(0, 200),
    );
  }

  if (!response.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign schedule failed (${response.status})`,
      response.status,
      formatV3ErrorBody(parsed, text.slice(0, 300)),
    );
  }
}

function parseOptionalAddressId(addressid: string | undefined): number | undefined {
  if (!addressid) return undefined;
  const n = Number.parseInt(addressid, 10);
  if (Number.isNaN(n) || n < 1) return undefined;
  return n;
}

/**
 * Creates a single-send campaign in ActiveCampaign (API v3), fills the
 * campaign’s message body, and schedules it for the configured newsletter list.
 *
 * @throws ActiveCampaignError on configuration or API failures
 */
export async function sendBlogPostNewsletter(
  options: SendBlogPostNewsletterOptions,
): Promise<SendBlogPostNewsletterResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  const listId = getNewsletterListId();
  const listIdInt = parseNewsletterListIdAsInt(listId);

  const internalName = `Blog: ${options.slug}`.slice(0, 240);
  const sendDate = formatCampaignSendDate(new Date());

  const campaignId = await createCampaignShellV3(baseUrl, apiKey, internalName, fetchImpl);
  const campaign = await getCampaignV3(baseUrl, apiKey, campaignId, fetchImpl);
  const messageId = campaign.message_id?.trim();
  if (!messageId) {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign has no message_id; cannot populate newsletter body via API v3',
      undefined,
      `campaign id ${campaignId}`,
    );
  }

  await updateMessageV3(
    baseUrl,
    apiKey,
    messageId,
    {
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
    },
    fetchImpl,
  );

  await scheduleCampaignEditV3(
    baseUrl,
    apiKey,
    campaignId,
    {
      listIdInt,
      scheduledDate: sendDate,
      addressId: parseOptionalAddressId(campaign.addressid),
    },
    fetchImpl,
  );

  return { messageId, campaignId };
}
