import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { createKitBroadcastDraft, getKitBroadcast, hashTagAudience, scheduleKitBroadcastDraft } from './kit-broadcast';
import { buildNewsletterContent } from './newsletter';
import { sendPreview } from './postmark-preview';
import { VALID_AUDIENCES, type Audience } from './subscribe-types';
import { kitTagIdFromEnv, kitTagSource } from './subscription-audiences';

class OperatorError extends Error {}
function requireThat(value: unknown, message: string): asserts value {
  if (!value) throw new OperatorError(message);
}
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const attemptSchema = z.object({
  attemptId: z.string().uuid(), startedAt: z.string().datetime(),
  state: z.enum(['draft-pending', 'draft', 'send-pending', 'scheduled']),
  contentSha256: digest, audienceSha256: digest, tagCount: z.number().int().positive(),
  broadcastId: positiveId.optional(), templateId: positiveId.optional(),
  sendAt: z.string().datetime().optional(), reasonSha256: digest.optional(),
}).strict().refine((item) => item.state === 'draft-pending' || item.broadcastId !== undefined)
  .refine((item) => item.state !== 'scheduled' || item.sendAt !== undefined);
const receiptSchema = z.object({ version: z.literal(1), subjectSha256: digest, attempts: z.array(attemptSchema) }).strict();
type Receipt = z.infer<typeof receiptSchema>;

export function parseKitEmail(markdown: string, explicitAudience?: string) {
  const source = markdown.replace(/\r\n?/g, '\n');
  const parsed = matter(source);
  const section = (name: string) => {
    const matches = [...source.matchAll(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'gm'))];
    requireThat(matches.length === 1, `Input requires exactly one ## ${name} section.`);
    return matches[0][1].trim();
  };
  const hasFrontmatter = source.startsWith('---\n');
  const subject = hasFrontmatter ? parsed.data.subject : section('Subject');
  const preview = hasFrontmatter ? parsed.data.preview : section('Preview text');
  const body = hasFrontmatter ? parsed.content.trim() : section('Body');
  const audienceValue: unknown = parsed.data.audience ?? explicitAudience?.split(',').map((key) => key.trim());
  const schema = z.object({
    subject: z.string().trim().min(1).refine((value) => !/[\r\n]/.test(value)),
    preview: z.string().trim().min(1).refine((value) => !/[\r\n]/.test(value)),
    body: z.string().trim().min(1), audience: z.array(z.enum(VALID_AUDIENCES)).min(1),
  });
  const result = schema.safeParse({ subject, preview, body, audience: audienceValue });
  requireThat(result.success, 'Input needs subject, preview, body and explicit audience keys (all, fiction, essays, lab, queer-columns, work-ai, th4f).');
  if (explicitAudience && parsed.data.audience) {
    requireThat(JSON.stringify([...new Set(result.data.audience)].sort()) === JSON.stringify([...new Set(explicitAudience.split(',').map((key) => key.trim()))].sort()), 'File audience and --audience disagree.');
  }
  return { ...result.data, audience: [...new Set(result.data.audience)].sort() as Audience[] };
}

function options(argv: string[]) {
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  const booleanFlags = ['--draft', '--send', '--resend'];
  const valueFlags = ['--file', '--audience', '--broadcast-id', '--confirm', '--reason', '--send-at', '--preview-to'];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    requireThat(!flags.has(arg) && values[arg] === undefined, 'Repeated command option.');
    if (booleanFlags.includes(arg)) flags.add(arg);
    else {
      requireThat(valueFlags.includes(arg), 'Unknown option. Use --file <markdown> [--draft | --send | --preview-to <address>].');
      const value = argv[++i];
      requireThat(value && !value.startsWith('--'), 'Command option is missing a value.');
      values[arg] = value;
    }
  }
  requireThat(values['--file'], '--file <markdown> is required.');
  requireThat(Number(flags.has('--draft')) + Number(flags.has('--send')) + Number(!!values['--preview-to']) <= 1, 'Choose only one of --draft, --send or --preview-to.');
  requireThat(!flags.has('--resend') || (flags.has('--send') || flags.has('--draft')), '--resend requires --draft or --send.');
  requireThat(!values['--reason'] || flags.has('--resend'), '--reason requires --resend.');
  requireThat(flags.has('--send') || !['--confirm', '--send-at', '--broadcast-id'].some((flag) => values[flag]), 'Send options require --send.');
  return { values, flags };
}

function save(file: string, receipt: Receipt) {
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, file);
}
function load(file: string, subjectSha256: string): Receipt {
  if (!existsSync(file)) return { version: 1, subjectSha256, attempts: [] };
  const parsed = receiptSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  requireThat(parsed.success && parsed.data.subjectSha256 === subjectSha256, 'Invalid local receipt. Reconcile history before retrying.');
  return parsed.data;
}

// Only inspect links the repository renderer actually emits. Check images too.
export function emailLinks(html: string): string[] {
  return [...new Set([...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")))];
}

const draftSchema = z.object({ broadcast: z.object({
  id: positiveId, subject: z.string(), preview_text: z.string(), content: z.string(),
  send_at: z.null(), public: z.literal(false), published_at: z.null(), status: z.literal('draft'),
  email_template: z.object({ id: positiveId }).nullish(),
  subscriber_filter: z.array(z.object({
    all: z.array(z.unknown()).max(0).nullish(), none: z.array(z.unknown()).max(0).nullish(),
    any: z.array(z.object({ type: z.literal('tag'), ids: z.array(positiveId).min(1) }).strict()).length(1),
  }).strict()).length(1),
}) });
function verifiedDraft(payload: unknown, id: number, subject: string, preview: string, html: string, tags: number[]) {
  const parsed = draftSchema.safeParse(payload);
  requireThat(parsed.success, 'Kit readback is not a private unscheduled draft with the expected tag filter. Reconcile in Kit.');
  const b = parsed.data.broadcast;
  requireThat(b.id === id && b.subject === subject && b.preview_text === preview && b.content === html
    && hashTagAudience(b.subscriber_filter[0].any[0].ids) === hashTagAudience(tags), 'Kit draft content or targeting differs. Review again before sending.');
  return b;
}

export async function runKitEmail(argv: string[], dependencies: {
  root?: string; env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; log?: (message: string) => void;
} = {}): Promise<void> {
  const root = dependencies.root ?? process.cwd();
  const env = dependencies.env ?? process.env;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const log = (message: string) => {
    for (const key of ['KIT_API_KEY', 'POSTMARK_SERVER_TOKEN']) {
      if (env[key]) message = message.split(env[key]!).join('[redacted]');
    }
    (dependencies.log ?? console.log)(message);
  };
  try {
    const { values, flags } = options(argv);
    const input = parseKitEmail(readFileSync(path.resolve(root, values['--file']), 'utf8'), values['--audience']);
    const content = buildNewsletterContent(input.subject, input.preview, input.body);
    const targeting = input.audience.map((key) => ({ key, tag: kitTagSource(key), id: kitTagIdFromEnv(key, env) || null }));
    const subjectSha256 = sha(input.subject.toLowerCase().replace(/\s+/g, ' '));
    const contentSha256 = sha(JSON.stringify([input.subject, input.preview, content]));
    const links = emailLinks(content.htmlBody);
    if (!flags.has('--draft') && !flags.has('--send') && !values['--preview-to']) {
      log(JSON.stringify({ mode: 'dry-run', subject: input.subject, preview: input.preview,
        targeting: { match: 'any tag (OR), one copy per active subscriber; Kit suppresses unsubscribed contacts', tags: targeting },
        approximateRecipients: null,
        countNote: 'Unavailable offline. Kit documents delivery stats, not an unsaved tag-union audience estimate; never sum overlapping tags.',
        template: 'Shared essay email frame; Kit account default template on draft creation (not verified offline).',
        html: content.htmlBody, text: content.textBody, links,
      }, null, 2));
      return;
    }
    if (values['--preview-to']) {
      await sendPreview({ to: values['--preview-to'], subject: input.subject, ...content, fetchImpl, env });
      log('Preview accepted by Postmark for the single explicitly addressed recipient.');
      return;
    }
    if (flags.has('--send')) {
      requireThat(values['--confirm'] === input.subject, '--send requires --confirm with the exact subject.');
      requireThat(/^\d+$/.test(values['--broadcast-id'] ?? '') && Number.isSafeInteger(Number(values['--broadcast-id'])) && Number(values['--broadcast-id']) > 0, '--send requires the broadcast ID from --draft.');
    }
    const tags = targeting.map((tag) => Number(tag.id));
    requireThat(targeting.every((tag) => /^\d+$/.test(tag.id ?? '')) && tags.every((id) => Number.isSafeInteger(id) && id > 0), 'Audience tag IDs are missing or invalid. Configure only the selected keys; never fall back to all subscribers.');
    const apiKey = env.KIT_API_KEY?.trim();
    requireThat(apiKey, 'KIT_API_KEY is missing. The operator must paste their V4 key into untracked .env.kit.local.');
    const connection = { apiKey, fetchImpl, subject: input.subject, description: input.preview, content: content.htmlBody, tagIds: tags };
    const directory = path.join(root, 'data/newsletter-sends');
    mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `email-${subjectSha256}.kit.json`);
    let fd: number;
    try { fd = openSync(`${file}.lock`, 'wx', 0o600); }
    catch { throw new OperatorError('Active or interrupted email lock. Reconcile process, receipt and Kit before removing it.'); }
    closeSync(fd);
    try {
      const receipt = load(file, subjectSha256);
      requireThat(!receipt.attempts.some((item) => item.state.endsWith('pending')), 'Ambiguous pending request. Reconcile in Kit before retrying; --resend cannot bypass it.');
      const priorSend = receipt.attempts.some((item) => item.state === 'scheduled');
      requireThat(!priorSend || flags.has('--resend'), 'Already scheduled. An intentional repeat requires --resend --reason.');
      requireThat(!flags.has('--resend') || (priorSend && values['--reason']?.trim()), '--resend requires a prior scheduled send and a nonempty --reason.');
      const sendAt = values['--send-at'] ?? new Date(Date.now() + 60000).toISOString();
      if (flags.has('--send')) {
        requireThat(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(sendAt) && Date.parse(sendAt) > Date.now(), '--send-at must be a future ISO timestamp with timezone.');
      }
      if (flags.has('--draft')) {
        const existing = receipt.attempts.findLast((item) => item.state === 'draft' && item.contentSha256 === contentSha256 && item.audienceSha256 === hashTagAudience(tags));
        if (existing) {
          verifiedDraft(await getKitBroadcast(connection, existing.broadcastId!), existing.broadcastId!, input.subject, input.preview, content.htmlBody, tags);
          log(`Verified existing Kit draft ${existing.broadcastId}: https://app.kit.com/broadcasts/${existing.broadcastId}/edit`);
          return;
        }
        const attempt: Receipt['attempts'][number] = { attemptId: randomUUID(), startedAt: new Date().toISOString(), state: 'draft-pending', contentSha256, audienceSha256: hashTagAudience(tags), tagCount: tags.length };
        receipt.attempts.push(attempt);
        save(file, receipt); // Keep a pending claim even if POST succeeds but its response is lost.
        attempt.broadcastId = await createKitBroadcastDraft(connection);
        save(file, receipt);
        const draft = verifiedDraft(await getKitBroadcast(connection, attempt.broadcastId), attempt.broadcastId, input.subject, input.preview, content.htmlBody, tags);
        attempt.templateId = draft.email_template?.id;
        attempt.state = 'draft';
        save(file, receipt);
        log(`Verified private Kit draft ${attempt.broadcastId} (send_at: null, public: false): https://app.kit.com/broadcasts/${attempt.broadcastId}/edit`);
        return;
      }
      const id = Number(values['--broadcast-id']);
      const attempt = receipt.attempts.find((item) => item.broadcastId === id);
      requireThat(attempt?.state === 'draft' && attempt.contentSha256 === contentSha256 && attempt.audienceSha256 === hashTagAudience(tags), 'Broadcast ID must belong to a matching locally verified draft. Create/review a new draft for changed input.');
      const draft = verifiedDraft(await getKitBroadcast(connection, id), id, input.subject, input.preview, content.htmlBody, tags);
      requireThat(draft.email_template?.id === attempt.templateId, 'Kit draft template changed. Review it before sending.');
      for (const link of links) {
        let url: URL;
        try { url = new URL(link); } catch { throw new OperatorError('Every body link must be an absolute HTTP(S) URL.'); }
        requireThat(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, 'Every body link must be an absolute HTTP(S) URL without credentials.');
        const response = await fetchImpl(url.href, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(30000) });
        await response.body?.cancel();
        requireThat(response.status === 200, 'A body link did not return HTTP 200. Nothing scheduled.');
      }
      requireThat(!values['--send-at'] || Date.parse(sendAt) > Date.now(), 'Approved send time has passed during link checks. Review a new time.');
      attempt.state = 'send-pending';
      attempt.sendAt = values['--send-at'] ? new Date(sendAt).toISOString() : new Date(Date.now() + 60000).toISOString();
      if (values['--reason']) attempt.reasonSha256 = sha(values['--reason']);
      save(file, receipt);
      await scheduleKitBroadcastDraft({ ...connection, id, sendAt: attempt.sendAt });
      attempt.state = 'scheduled';
      save(file, receipt);
      log(`Kit broadcast ${id} scheduled for ${attempt.sendAt}. Provider acceptance is not inbox delivery.`);
    } finally { unlinkSync(`${file}.lock`); }
  } catch (error) {
    // Do not echo arbitrary file paths, parser/provider bodies, addresses or network errors.
    if (error instanceof OperatorError) throw error;
    throw new OperatorError('Kit email operation failed. Check input/configuration and reconcile any pending receipt in Kit before retrying.');
  }
}
