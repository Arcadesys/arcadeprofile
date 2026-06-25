/**
 * Active delivery reconciliation.
 *
 * Webhooks are the primary delivery signal, but the production outage was
 * invisible precisely because the system trusted a webhook that was never
 * registered AND trusted `submitted` rows whose message ids don't exist on
 * Postmark. This reconciler closes that gap: for posts stuck in `submitted`
 * past a grace window, it actively queries Postmark's Messages API and:
 *   - confirms delivery/bounce → records events → status advances to `delivered`
 *     (self-healing even with no webhook at all); or
 *   - finds NO Postmark record (the phantom-send case) → flags `undelivered`,
 *     stamps `undeliveredAt`, and surfaces it loudly.
 */
import type { Payload } from 'payload';

import { logger } from './logger';
import { getPostmarkServerToken } from './postmark-config';
import {
  type PostmarkEventsPayload,
  handlePostmarkWebhook,
} from './postmark-events';

const DEFAULT_GRACE_MS = 30 * 60 * 1000; // 30 minutes
const POSTMARK_API_BASE = 'https://api.postmarkapp.com';

export type ReconcileMessageStatus =
  | { kind: 'delivered'; occurredAt?: string; recipient?: string; metadata?: Record<string, string> }
  | { kind: 'bounced'; occurredAt?: string; recipient?: string; metadata?: Record<string, string> }
  | { kind: 'queued' } // accepted, still in flight at Postmark
  | { kind: 'not-found' }; // Postmark has no record of this message id

export type ReconcileResult = {
  checked: number;
  delivered: number;
  undelivered: number;
  undeliveredPosts: { id: number; slug: string; attemptId: string | null }[];
};

type ReconcilePost = {
  id: number;
  slug: string;
  newsletterSend?: {
    status?: string | null;
    attemptId?: string | null;
    messageId?: string | null;
    sentAt?: string | null;
  } | null;
};

type ReconcilePayload = PostmarkEventsPayload & Pick<Payload, 'update'>;

type ReconcileDeps = {
  now?: () => Date;
  graceMs?: number;
  fetchMessageStatus?: (messageId: string) => Promise<ReconcileMessageStatus>;
  handleEvent?: typeof handlePostmarkWebhook;
};

function parseMessageIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))];
}

/** Default Postmark Messages API lookup for a single outbound message. */
async function defaultFetchMessageStatus(messageId: string): Promise<ReconcileMessageStatus> {
  const token = getPostmarkServerToken();
  if (!token) return { kind: 'queued' }; // can't verify without a token; try again later

  try {
    const response = await fetch(`${POSTMARK_API_BASE}/messages/outbound/${messageId}/details`, {
      headers: { 'X-Postmark-Server-Token': token, Accept: 'application/json' },
    });

    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) return { kind: 'queued' }; // transient API error; re-check next run

    const body = (await response.json()) as {
      MessageID?: string;
      Recipients?: string[];
      Metadata?: Record<string, string>;
      MessageEvents?: { Type?: string; ReceivedAt?: string }[];
    };

    // Postmark returns null fields for an unknown id rather than a clean 404.
    if (!body.MessageID) return { kind: 'not-found' };

    const events = body.MessageEvents ?? [];
    const recipient = body.Recipients?.[0];
    const metadata = body.Metadata;
    const bounced = events.find((e) => e.Type === 'Bounced');
    if (bounced) return { kind: 'bounced', occurredAt: bounced.ReceivedAt, recipient, metadata };
    const delivered = events.find((e) => e.Type === 'Delivered');
    if (delivered) return { kind: 'delivered', occurredAt: delivered.ReceivedAt, recipient, metadata };
    return { kind: 'queued' };
  } catch (err) {
    // Network failure or non-JSON (proxy/CDN error page): treat as transient
    // and re-check next run rather than crashing the reconciler loop.
    logger.error({ err, messageId }, '[newsletter-reconcile] failed to fetch message status from Postmark');
    return { kind: 'queued' };
  }
}

/** Synthesize a Postmark-webhook-shaped payload so confirmed events flow
 * through the same dedup + summary-refresh path as real webhooks. */
function syntheticWebhookPayload(
  messageId: string,
  status: ReconcileMessageStatus,
): Record<string, unknown> | null {
  if (status.kind !== 'delivered' && status.kind !== 'bounced') return null;
  return {
    RecordType: status.kind === 'delivered' ? 'Delivery' : 'Bounce',
    MessageID: messageId,
    ...(status.recipient ? { Recipient: status.recipient } : {}),
    ...(status.occurredAt
      ? status.kind === 'delivered'
        ? { DeliveredAt: status.occurredAt }
        : { BouncedAt: status.occurredAt }
      : {}),
    ...(status.metadata ? { Metadata: status.metadata } : {}),
  };
}

export async function reconcileNewsletters(
  payload: ReconcilePayload,
  deps: ReconcileDeps = {},
): Promise<ReconcileResult> {
  const now = deps.now ?? (() => new Date());
  const graceMs = deps.graceMs ?? DEFAULT_GRACE_MS;
  const fetchMessageStatus = deps.fetchMessageStatus ?? defaultFetchMessageStatus;
  const handleEvent = deps.handleEvent ?? handlePostmarkWebhook;

  const cutoff = new Date(now().getTime() - graceMs).toISOString();
  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    // Cap per run so a large `submitted` backlog (e.g. during a webhook
    // outage) can't blow up cron execution time; the rest are picked up next run.
    limit: 50,
    overrideAccess: true,
    where: {
      and: [
        { 'newsletterSend.status': { equals: 'submitted' } },
        { 'newsletterSend.sentAt': { less_than: cutoff } },
      ],
    },
  });

  const out: ReconcileResult = { checked: 0, delivered: 0, undelivered: 0, undeliveredPosts: [] };

  for (const post of result.docs as ReconcilePost[]) {
    out.checked += 1;
    const send = post.newsletterSend ?? {};
    const attemptId = send.attemptId ?? null;
    const messageIds = parseMessageIds(send.messageId);
    if (messageIds.length === 0) continue;

    let anyFound = false;
    let allTerminal = true;
    for (const messageId of messageIds) {
      const status = await fetchMessageStatus(messageId);
      if (status.kind === 'queued') {
        anyFound = true;
        allTerminal = false;
        continue;
      }
      if (status.kind === 'not-found') {
        allTerminal = false;
        continue;
      }
      // delivered | bounced — record it; the post advances to `delivered` only
      // once EVERY accepted message reaches a terminal outcome.
      anyFound = true;
      const synthetic = syntheticWebhookPayload(messageId, status);
      if (synthetic) await handleEvent(payload, synthetic);
    }

    if (allTerminal && anyFound) {
      // handleEvent refreshed the summary; the post's status is now `delivered`.
      out.delivered += 1;
      continue;
    }

    if (!anyFound) {
      // Postmark has no record of any message id for this attempt — the
      // phantom-send case. Alarm, don't auto-resend (fix-forward).
      const nowIso = now().toISOString();
      await payload.update({
        collection: 'posts',
        id: post.id,
        depth: 0,
        overrideAccess: true,
        data: {
          newsletterSend: {
            ...send,
            status: 'undelivered',
            undeliveredAt: nowIso,
            lastSyncedAt: nowIso,
            lastError:
              'Reconcile: Postmark has no record of the submitted message id(s) — not delivered.',
          },
        },
      });
      out.undelivered += 1;
      out.undeliveredPosts.push({ id: post.id, slug: post.slug, attemptId });
      logger.error(
        { postId: post.id, slug: post.slug, attemptId, messageIds },
        '[newsletter-reconcile] submitted message has no Postmark record — flagged undelivered',
      );
    }
    // else: still queued at Postmark — leave `submitted`, re-check next run.
  }

  return out;
}
