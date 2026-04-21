/**
 * ActiveCampaign: create a transactional-style HTML message (API v3), then
 * schedule a one-off list send (legacy v1 campaign_create). Both use the
 * same account host and Api-Token header per ActiveCampaign docs.
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

function getApiBaseUrl(): string {
  const raw = process.env.AC_API_URL?.trim();
  if (!raw) {
    throw new ActiveCampaignError('Missing AC_API_URL environment variable');
  }
  return raw.replace(/\/+$/, '');
}

function getApiKey(): string {
  const key = process.env.AC_API_KEY?.trim();
  if (!key) {
    throw new ActiveCampaignError('Missing AC_API_KEY environment variable');
  }
  return key;
}

function getNewsletterListId(): string {
  const id = process.env.AC_NEWSLETTER_LIST_ID?.trim();
  if (!id) {
    throw new ActiveCampaignError('Missing AC_NEWSLETTER_LIST_ID environment variable');
  }
  return id;
}

function getFromName(): string {
  return process.env.AC_NEWSLETTER_FROM_NAME?.trim() || 'The Arcades';
}

function getFromEmail(): string {
  const email = process.env.AC_NEWSLETTER_FROM_EMAIL?.trim();
  if (!email) {
    throw new ActiveCampaignError('Missing AC_NEWSLETTER_FROM_EMAIL environment variable');
  }
  return email;
}

function getReplyToEmail(): string {
  return process.env.AC_NEWSLETTER_REPLY_TO?.trim() || getFromEmail();
}

function formatCampaignSendDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

type AcV3MessageResponse = {
  message?: {
    id?: string;
  };
  errors?: Array<{ title?: string; detail?: string } | string>;
};

async function createMessageV3(
  baseUrl: string,
  apiKey: string,
  options: { subject: string; htmlBody: string; textBody: string },
  fetchImpl: typeof fetch,
): Promise<string> {
  const url = `${baseUrl}/api/3/messages`;
  const fromEmail = getFromEmail();
  const body = {
    message: {
      fromname: getFromName(),
      /** Some AC accounts expect `email`; others document `fromemail`. */
      email: fromEmail,
      fromemail: fromEmail,
      reply2: getReplyToEmail(),
      subject: options.subject,
      html: options.htmlBody,
      text: options.textBody,
    },
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
  let parsed: AcV3MessageResponse;
  try {
    parsed = JSON.parse(text) as AcV3MessageResponse;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign API v3 returned non-JSON when creating message',
      response.status,
      text.slice(0, 200),
    );
  }

  if (!response.ok) {
    const detail =
      typeof parsed.errors?.[0] === 'string'
        ? parsed.errors[0]
        : parsed.errors?.map((e) => (typeof e === 'string' ? e : e.detail || e.title)).join('; ');
    throw new ActiveCampaignError(
      `ActiveCampaign message create failed (${response.status})`,
      response.status,
      detail || text.slice(0, 300),
    );
  }

  const id = parsed.message?.id;
  if (!id) {
    throw new ActiveCampaignError(
      'ActiveCampaign message create response missing message.id',
      response.status,
      text.slice(0, 300),
    );
  }

  return id;
}

type AcV1CampaignCreateResponse = {
  result_code?: number | string;
  result_message?: string;
  id?: string | number;
};

function parseV1Json(raw: string): AcV1CampaignCreateResponse {
  try {
    return JSON.parse(raw) as AcV1CampaignCreateResponse;
  } catch {
    throw new ActiveCampaignError(
      'ActiveCampaign legacy API returned non-JSON',
      undefined,
      raw.slice(0, 200),
    );
  }
}

function isV1Success(result: AcV1CampaignCreateResponse): boolean {
  const code = result.result_code;
  return code === 1 || code === '1';
}

async function createCampaignSendV1(
  baseUrl: string,
  apiKey: string,
  options: { messageId: string; listId: string; name: string; sendDate: string },
  fetchImpl: typeof fetch,
): Promise<string> {
  const query = new URLSearchParams({
    api_action: 'campaign_create',
    api_output: 'json',
  });

  const listKey = `p[${options.listId}]`;
  const messageKey = `m[${options.messageId}]`;

  const body = new URLSearchParams({
    type: 'single',
    segmentid: '0',
    name: options.name,
    sdate: options.sendDate,
    status: '1',
    public: '0',
    trackreads: '1',
    trackreplies: '0',
    htmlunsub: '1',
    textunsub: '1',
    [listKey]: options.listId,
    [messageKey]: '100',
  });

  const url = `${baseUrl}/admin/api.php?${query.toString()}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    },
    fetchImpl,
    REQUEST_TIMEOUT_MS,
  );

  const text = await response.text();
  const parsed = parseV1Json(text);

  if (!response.ok) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign_create HTTP error (${response.status})`,
      response.status,
      parsed.result_message || text.slice(0, 300),
    );
  }

  if (!isV1Success(parsed)) {
    throw new ActiveCampaignError(
      `ActiveCampaign campaign_create failed: ${parsed.result_message || 'unknown error'}`,
      response.status,
      text.slice(0, 300),
    );
  }

  const id = parsed.id !== undefined && parsed.id !== null ? String(parsed.id) : '';
  if (!id) {
    throw new ActiveCampaignError(
      'ActiveCampaign campaign_create response missing id',
      response.status,
      text.slice(0, 300),
    );
  }

  return id;
}

/**
 * Creates an HTML message in ActiveCampaign and schedules a one-off campaign
 * to the configured newsletter list.
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

  const internalName = `Blog: ${options.slug}`.slice(0, 240);
  const sendDate = formatCampaignSendDate(new Date());

  const messageId = await createMessageV3(
    baseUrl,
    apiKey,
    {
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
    },
    fetchImpl,
  );

  const campaignId = await createCampaignSendV1(
    baseUrl,
    apiKey,
    {
      messageId,
      listId,
      name: internalName,
      sendDate,
    },
    fetchImpl,
  );

  return { messageId, campaignId };
}
