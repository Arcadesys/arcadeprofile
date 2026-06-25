/**
 * Single source of truth for the per-post newsletter send state machine.
 *
 * The old model conflated "Postmark accepted the batch" with "the email was
 * delivered". This splits acceptance (`submitted`) from confirmation
 * (`delivered`) and adds an explicit `undelivered` alarm state so a send that
 * Postmark never actually shipped can't masquerade as success.
 */

export const NEWSLETTER_SEND_STATUSES = [
  'pending', // published, newsletter not yet attempted
  'suppressed', // suppressNewsletter set — deliberately not sending
  'skipped', // zero recipients resolved (empty audience)
  'submitted', // >=1 message accepted by Postmark this attempt; awaiting confirmation
  'delivered', // webhook/reconcile confirmed delivery for the attempt (terminal)
  'failed', // Postmark rejected / partial failure / attempt errored (retryable)
  'undelivered', // submitted, grace elapsed, no confirmation — alert + manual only
] as const;

export type NewsletterSendStatus = (typeof NEWSLETTER_SEND_STATUSES)[number];

export const NEWSLETTER_SEND_STATUS_OPTIONS: { label: string; value: NewsletterSendStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Suppressed', value: 'suppressed' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Submitted (accepted by Postmark)', value: 'submitted' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
  { label: 'Undelivered (no confirmation)', value: 'undelivered' },
];

// Terminal states the publish job must never re-attempt automatically.
// `delivered` is success; `suppressed`/`skipped` are deliberate non-sends;
// `undelivered` requires a human decision (fix-forward) rather than auto-resend.
const TERMINAL_STATUSES = new Set<NewsletterSendStatus>([
  'delivered',
  'suppressed',
  'skipped',
  'undelivered',
]);

// Statuses the retry loop is allowed to re-attempt for *new* forward operation.
const AUTO_RETRYABLE_STATUSES = new Set<NewsletterSendStatus>(['failed', 'pending']);

export function isTerminalNewsletterStatus(status: NewsletterSendStatus | null | undefined): boolean {
  return status ? TERMINAL_STATUSES.has(status) : false;
}

export function isAutoRetryableNewsletterStatus(
  status: NewsletterSendStatus | null | undefined,
): boolean {
  return status ? AUTO_RETRYABLE_STATUSES.has(status) : false;
}

/**
 * Derive the post-level status from per-attempt Postmark counts.
 * `delivered` only once every accepted message reached a terminal Postmark
 * outcome (delivered or bounced). Bounces are per-recipient counts, not a
 * post-level failure.
 */
export function deriveSubmittedStatus(counts: {
  acceptedCount: number;
  deliveredCount: number;
  bouncedCount: number;
}): Extract<NewsletterSendStatus, 'submitted' | 'delivered'> {
  if (counts.acceptedCount > 0 && counts.deliveredCount + counts.bouncedCount >= counts.acceptedCount) {
    return 'delivered';
  }
  return 'submitted';
}
