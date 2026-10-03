import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ESSAY_GROUPS = new Set([
  'ai-art-experiments',
  'arcade-blog',
  'bunch',
  'on-writing',
  'pride-essays',
  'the-singularity-log',
  'white-cane-chronicles',
]);

export interface NewsletterAttempt {
  id: string;
  startedAt: string;
  completedAt?: string;
  reason?: string;
  audienceCount: number;
  audienceSha256: string;
  acceptedCount: number;
  messageIds: string[];
}

export interface NewsletterReceipt {
  version: 1;
  slug: string;
  group: string;
  productionUrl: string;
  attempts: NewsletterAttempt[];
}

export function assertEssayGroup(group: string): void {
  if (!ESSAY_GROUPS.has(group)) {
    throw new Error(
      `Newsletter sends are limited to the essay groups; ${group} is not eligible.`,
    );
  }
}

export function hashAudience(emails: readonly string[]): string {
  return createHash('sha256')
    .update([...new Set(emails.map((email) => email.trim().toLowerCase()))].sort().join('\n'))
    .digest('hex');
}

export function receiptPath(slug: string, root = process.cwd()): string {
  return path.join(root, 'data', 'newsletter-sends', `${slug}.json`);
}

export function readReceipt(filePath: string): NewsletterReceipt | null {
  if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) return null;
  return JSON.parse(readFileSync(filePath, 'utf8')) as NewsletterReceipt;
}

export function writeReceipt(filePath: string, receipt: NewsletterReceipt): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, filePath);
}

export function prepareAttempt(options: {
  receipt: NewsletterReceipt | null;
  slug: string;
  group: string;
  productionUrl: string;
  audience: string[];
  resend: boolean;
  reason?: string;
  now?: Date;
}): { receipt: NewsletterReceipt; attempt: NewsletterAttempt; resumed: boolean } {
  assertEssayGroup(options.group);
  if (options.receipt && (
    options.receipt.slug !== options.slug
    || options.receipt.group !== options.group
    || options.receipt.productionUrl !== options.productionUrl
  )) {
    throw new Error('The existing newsletter receipt does not match this essay; refusing to reuse it.');
  }
  const completed = options.receipt?.attempts.some((attempt) => attempt.completedAt);
  const pending = options.receipt?.attempts.find((attempt) => !attempt.completedAt);
  if (pending) {
    const currentHash = hashAudience(options.audience);
    if (pending.audienceSha256 !== currentHash) {
      throw new Error('The Kit audience changed during an interrupted send; refusing an ambiguous resume.');
    }
    return { receipt: options.receipt!, attempt: pending, resumed: true };
  }
  if (completed && !options.resend) {
    throw new Error('This essay already has a completed broadcast receipt. Use --resend --reason "<reason>" to send again.');
  }
  if (options.resend && !options.reason?.trim()) {
    throw new Error('--resend requires --reason "<reason>".');
  }
  if (options.resend && !completed) {
    throw new Error('--resend is only valid after a completed broadcast.');
  }
  const now = (options.now ?? new Date()).toISOString();
  const attempt: NewsletterAttempt = {
    id: randomUUID(),
    startedAt: now,
    ...(options.reason?.trim() ? { reason: options.reason.trim() } : {}),
    audienceCount: options.audience.length,
    audienceSha256: hashAudience(options.audience),
    acceptedCount: 0,
    messageIds: [],
  };
  const receipt: NewsletterReceipt = options.receipt ?? {
    version: 1,
    slug: options.slug,
    group: options.group,
    productionUrl: options.productionUrl,
    attempts: [],
  };
  receipt.attempts.push(attempt);
  return { receipt, attempt, resumed: false };
}

export async function verifyProductionEssayUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'User-Agent': 'arcadeprofile-newsletter-harness/1.0' },
  });
  if (response.status !== 200) {
    throw new Error(`Production essay URL verification failed: ${url} returned ${response.status}.`);
  }
}
