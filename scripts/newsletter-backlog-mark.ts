/**
 * Fix-forward backlog audit (read-only by default; `--apply` to write).
 *
 * After the state-machine migration backfills legacy `sent` → `delivered`, this
 * script adds the accuracy/observability pass on top: for legacy posts whose
 * delivery was never confirmed (deliveredCount = 0), it checks each recorded
 * Postmark message id against the live server and, for phantom sends (no
 * record), stamps `newsletterSend.lastError` for the audit trail.
 *
 * It NEVER resets a post to a re-sendable state — fix-forward means the backlog
 * is not re-blasted; only newly-published posts email subscribers.
 *
 *   npx tsx scripts/newsletter-backlog-mark.ts           # audit only
 *   npx tsx scripts/newsletter-backlog-mark.ts --apply   # stamp phantom rows
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

for (const file of ['.env.production.local', '.env.local']) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) loadDotenv({ path, override: false });
}

const POSTMARK_API = 'https://api.postmarkapp.com';
const PHANTOM_NOTE = 'Backlog audit: Postmark has no record of the message id(s) — historical phantom, not delivered (fix-forward, no resend).';

async function postmarkHasMessage(messageId: string, token: string): Promise<boolean> {
  const res = await fetch(`${POSTMARK_API}/messages/outbound/${messageId}/details`, {
    headers: { 'X-Postmark-Server-Token': token, Accept: 'application/json' },
  });
  if (res.status === 404) return false;
  if (res.status === 422) {
    // Postmark reports an unknown message id as HTTP 422 with ErrorCode 701
    // ("This message was not found"), not a 404.
    const body = (await res.json().catch(() => null)) as { ErrorCode?: number } | null;
    return body?.ErrorCode !== 701;
  }
  if (!res.ok) return true; // transient/uncertain — don't flag as phantom
  const body = (await res.json()) as { MessageID?: string };
  return Boolean(body.MessageID);
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) {
    console.error('Missing POSTMARK_SERVER_TOKEN');
    process.exit(1);
  }

  const { getPayload } = await import('payload');
  const config = (await import('../payload.config')).default;
  const payload = await getPayload({ config });

  // Suppressed posts — surface for review (guardrail follow-up).
  const suppressed = await payload.find({
    collection: 'posts',
    where: { suppressNewsletter: { equals: true } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  console.log(`\nsuppressNewsletter=true posts (${suppressed.docs.length}):`);
  for (const post of suppressed.docs) console.log(`  - ${post.slug} (#${post.id})`);

  // Legacy posts whose delivery was never confirmed.
  const candidates = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { 'newsletterSend.status': { equals: 'delivered' } },
        { 'newsletterSend.acceptedCount': { greater_than: 0 } },
        { 'newsletterSend.deliveredCount': { equals: 0 } },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  console.log(`\nUnconfirmed legacy 'delivered' posts to audit: ${candidates.docs.length}`);
  let phantom = 0;
  let real = 0;

  for (const post of candidates.docs) {
    const send = (post.newsletterSend ?? {}) as { messageId?: string | null };
    const ids = (send.messageId ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) continue;

    let anyFound = false;
    for (const id of ids) {
      if (await postmarkHasMessage(id, token)) {
        anyFound = true;
        break;
      }
    }

    if (anyFound) {
      real += 1;
      console.log(`  ✓ ${post.slug} (#${post.id}) — Postmark has a record (genuinely delivered).`);
      continue;
    }

    phantom += 1;
    console.log(`  ✗ ${post.slug} (#${post.id}) — PHANTOM (no Postmark record).`);
    if (apply) {
      await payload.update({
        collection: 'posts',
        id: post.id,
        depth: 0,
        overrideAccess: true,
        data: { newsletterSend: { ...(post.newsletterSend ?? {}), lastError: PHANTOM_NOTE } },
      });
    }
  }

  console.log(`\nSummary: ${real} genuinely delivered, ${phantom} phantom${apply ? ' (stamped)' : ' (dry run — re-run with --apply to stamp)'}.`);
  console.log('No posts were reset for resend (fix-forward).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
