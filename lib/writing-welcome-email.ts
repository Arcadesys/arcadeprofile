import { createKitUnsubscribeToken, newProcessingToken, redisCommand, verificationSiteUrl } from './writing-signup';
import { PostmarkRejectedError } from './writing-signup';
import type { Audience } from './subscribe-types';

type WelcomeLink = { label: string; url: string };
type WelcomeCopy = {
  subject: string;
  preview: string;
  paragraphs: Array<Array<string | WelcomeLink>>;
};

const priority: Audience[] = ['all', 'fiction', 'essays', 'lab'];
const copy: Record<Audience, WelcomeCopy> = {
  all: {
    subject: "Welcome to The Arcades' writing",
    preview: 'Fiction, essays, and a place to start reading.',
    paragraphs: [
      ['Thanks for joining the writing list. This is where I share new fiction and essays from The Arcades when they are ready.'],
      ['You can ', { label: 'browse the writing shelf', url: 'https://thearcades.me/writing' }, ', find ', { label: 'stories and serial work', url: 'https://thearcades.me/stories' }, ', or explore ', { label: 'essays on creativity, access, technology, and being human', url: 'https://thearcades.me/essays' }, '.'],
      ['Read at your own pace. You can unsubscribe from any email.'],
      ['Austen'],
    ],
  },
  fiction: {
    subject: 'Welcome to the fiction shelf',
    preview: 'Stories, serial work, and downloadable editions.',
    paragraphs: [
      ['Thanks for choosing fiction updates. I will write when a new story, serial installment, or reading edition is ready.'],
      ['Start with ', { label: 'the fiction shelf', url: 'https://thearcades.me/stories' }, '. The site keeps reading and download links together, so you can choose the format that works for you.'],
      ['You can unsubscribe from any email.'],
      ['Austen'],
    ],
  },
  essays: {
    subject: 'Welcome to the essays',
    preview: 'Notes on creativity, access, technology, and being human.',
    paragraphs: [
      ['Thanks for choosing essay updates. I write about creativity, accessibility, technology, queer life, and the craft of making things.'],
      ['The ', { label: 'essay shelf', url: 'https://thearcades.me/essays' }, ' has the pieces available now. I will send new essays when they are published.'],
      ['You can unsubscribe from any email.'],
      ['Austen'],
    ],
  },
  lab: {
    subject: 'Welcome to the Lab notes',
    preview: 'Updates from the workbench at The Arcades.',
    paragraphs: [
      ["Thanks for choosing Lab updates. This list is for the projects and experiments I share from The Arcades' workbench."],
      ['You can ', { label: 'visit the Lab', url: 'https://thearcades.me/lab' }, ' whenever you want to see what is there now. I will write when there is a new public build or update to share.'],
      ['You can unsubscribe from any email.'],
      ['Austen'],
    ],
  },
};

export function primaryWritingWelcomeAudience(audiences: Audience[]): Audience | null {
  return priority.find((audience) => audiences.includes(audience)) ?? null;
}

export function buildWritingWelcomeEmail(audiences: Audience[], unsubscribeUrl?: string) {
  const audience = primaryWritingWelcomeAudience(audiences);
  if (!audience) throw new Error('A writing welcome email needs a selected audience');
  const message = copy[audience];
  const unsubscribeAnchor = unsubscribeUrl ? `<a href="${unsubscribeUrl}">unsubscribe from any email</a>` : 'unsubscribe from any email';
  const renderText = (value: string) => unsubscribeUrl ? value.replace('unsubscribe from any email', `unsubscribe from any email (${unsubscribeUrl})`) : value;
  const renderHtml = (value: string) => value.replace('unsubscribe from any email', unsubscribeAnchor);
  const html = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${message.preview}</div>`
    + message.paragraphs.map((paragraph) => `<p>${paragraph.map((part) => typeof part === 'string' ? renderHtml(part) : `<a href="${part.url}">${part.label}</a>`).join('')}</p>`).join('');
  const text = `${message.preview}\n\n${message.paragraphs.map((paragraph) => paragraph.map((part) => typeof part === 'string' ? renderText(part) : `${part.label} (${part.url})`).join('')).join('\n\n')}`;
  return { audience, subject: message.subject, preview: message.preview, html, text };
}

function senderConfig() {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const from = process.env.POSTMARK_FROM_EMAIL?.trim();
  if (!serverToken || !from) throw new Error('Writing welcome sender is not configured');
  return { serverToken, from };
}

async function sendWritingWelcome(email: string, subscriberId: number, emailDigest: string, audiences: Audience[], fetcher: typeof fetch) {
  const config = senderConfig();
  const baseUrl = verificationSiteUrl();
  const unsubscribeToken = createKitUnsubscribeToken(subscriberId, emailDigest);
  const unsubscribeUrl = `${baseUrl}/subscribe/unsubscribe#${unsubscribeToken}`;
  const oneClickUnsubscribeUrl = `${baseUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const content = buildWritingWelcomeEmail(audiences, unsubscribeUrl);
  const response = await fetcher('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'X-Postmark-Server-Token': config.serverToken, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      From: process.env.POSTMARK_FROM_NAME?.trim() ? `${process.env.POSTMARK_FROM_NAME.trim()} <${config.from}>` : config.from,
      To: email,
      Subject: content.subject,
      HtmlBody: content.html,
      TextBody: content.text,
      MessageStream: process.env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || 'outbound',
      TrackLinks: 'None',
      TrackOpens: false,
      Headers: [
        { Name: 'List-Unsubscribe', Value: `<${oneClickUnsubscribeUrl}>` },
        { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status >= 400 && response.status < 500) throw new PostmarkRejectedError();
  if (!response.ok) throw new Error('Welcome delivery result is ambiguous');
  let receipt: { ErrorCode?: unknown; MessageID?: unknown };
  try { receipt = await response.json() as { ErrorCode?: unknown; MessageID?: unknown }; }
  catch { throw new Error('Welcome delivery receipt was invalid'); }
  if (receipt.ErrorCode !== 0) throw new PostmarkRejectedError();
  if (typeof receipt.MessageID !== 'string' || !receipt.MessageID) throw new Error('Welcome delivery receipt was incomplete');
  return receipt.MessageID;
}

export type WelcomeDeliveryResult = 'sent' | 'already-claimed' | 'uncertain' | 'rejected' | 'disabled';

/** Claim once per HMAC email digest; a claim is durable across signup challenges. */
export async function sendWritingWelcomeOnce(input: {
  email: string;
  subscriberId: number;
  emailDigest: string;
  audiences: Audience[];
  fetcher?: typeof fetch;
}): Promise<WelcomeDeliveryResult> {
  if (process.env.WRITING_WELCOME_ENABLED?.trim().toLowerCase() !== 'true') return 'disabled';
  senderConfig();
  if (!/^[a-f0-9]{64}$/.test(input.emailDigest)) throw new Error('Writing welcome email digest is invalid');
  const fetcher = input.fetcher ?? fetch;
  const primary = primaryWritingWelcomeAudience(input.audiences);
  if (!primary) throw new Error('A writing welcome email needs a selected audience');
  const key = `writing:welcome:${input.emailDigest}`;
  const claim = newProcessingToken();
  const claimed = await redisCommand<string | null>(['SET', key, `sending:${claim}`, 'NX'], fetcher);
  if (claimed !== 'OK') return 'already-claimed';
  let messageId: string;
  try {
    messageId = await sendWritingWelcome(input.email, input.subscriberId, input.emailDigest, input.audiences, fetcher);
  } catch (error) {
    if (error instanceof PostmarkRejectedError) {
      const script = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`;
      await redisCommand(['EVAL', script, 1, key, `sending:${claim}`], fetcher);
      return 'rejected';
    }
    // A timeout/5xx may follow provider acceptance; keep the durable claim.
    return 'uncertain';
  }
  const script = `if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end`;
  const committed = await redisCommand<number>(['EVAL', script, 1, key, `sending:${claim}`, JSON.stringify({ state: 'sent', audience: primary, messageId })], fetcher);
  return committed === 1 ? 'sent' : 'uncertain';
}
