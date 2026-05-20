import {
  ActiveCampaignError,
  createScheduledCampaign,
  type CreateScheduledCampaignOptions,
  type CreateScheduledCampaignResult,
  getAudienceListId,
  getCampaignStatus,
  isCampaignFrozen,
  updateCampaignSendDate,
} from './activecampaign';

export type AcCampaignStatus = 'pending' | 'scheduled' | 'sent' | 'failed';

export interface PostAcCampaignState {
  campaignId?: string | null;
  messageId?: string | null;
  scheduledFor?: string | Date | null;
  status?: AcCampaignStatus | string | null;
  targetedLists?: string | null;
  lastSyncedAt?: string | Date | null;
  lastError?: string | null;
}

export interface SyncPostCampaignInput {
  /** Stable per-post identifier used to build AC's internal campaign name. */
  slug: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  /** When AC should fire the send. Drives both create and reschedule paths. */
  scheduledPublishDate: Date;
  /** Group.category from Groups collection; `null` if the post has no group. */
  groupCategory: string | null;
  /** Existing AC sync state on the post. Empty/undefined ⇒ first run. */
  acCampaign?: PostAcCampaignState | null;
  /** Editor intent override — when true, the sync is skipped entirely. */
  suppressNewsletter?: boolean | null;
}

export interface SyncPostCampaignDeps {
  createScheduledCampaign?: (
    options: CreateScheduledCampaignOptions,
  ) => Promise<CreateScheduledCampaignResult>;
  updateCampaignSendDate?: (options: {
    campaignId: string;
    scheduledSendAt: Date;
    fetchImpl?: typeof fetch;
  }) => Promise<{ scheduledFor: Date }>;
  getCampaignStatus?: typeof getCampaignStatus;
  resolveListIds?: (groupCategory: string | null) => string[];
  /** Override the clock — used by tests to assert `lastSyncedAt`. */
  now?: () => Date;
}

export type SyncOutcome =
  | { kind: 'created'; state: PostAcCampaignState }
  | { kind: 'rescheduled'; state: PostAcCampaignState }
  | { kind: 'retried'; state: PostAcCampaignState }
  | { kind: 'skipped'; reason: string }
  | { kind: 'failed'; state: PostAcCampaignState; error: unknown }
  | { kind: 'already-sent'; state: PostAcCampaignState };

const ALREADY_SENT_MESSAGE =
  'campaign already sent; date change not propagated. Clear acCampaign or set suppressNewsletter to override.';

/**
 * Resolves the AC list ids a post should target based on its group's
 * category. Fiction posts go to ALL + FICTION; everything else (including
 * posts with no group) goes to ALL + ESSAYS. Each list resolves to a real
 * AC numeric id via the AC_LIST_ID_*_PERPOST env vars in lib/activecampaign.ts.
 */
export function resolveCampaignListIds(groupCategory: string | null): string[] {
  const secondary = groupCategory === 'fiction' ? 'fiction' : 'essays';
  return [getAudienceListId('all'), getAudienceListId(secondary)];
}

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function sameInstant(a: string | Date | null | undefined, b: Date): boolean {
  const ai = toIsoOrNull(a);
  if (!ai) return false;
  const bi = b.toISOString();
  if (ai === bi) return true;
  // Allow second-precision equality — AC's `sdate` formatter (see
  // formatCampaignSendDate in lib/activecampaign.ts) strips sub-second
  // precision, so a round-trip can shave milliseconds off the stored value.
  return Math.abs(new Date(ai).getTime() - b.getTime()) < 1000;
}

function describeError(err: unknown): string {
  if (err instanceof ActiveCampaignError) {
    const detail = err.details ? ` | ${err.details}` : '';
    const status = err.causeStatus !== undefined ? ` (HTTP ${err.causeStatus})` : '';
    return `${err.message}${status}${detail}`.slice(0, 2000);
  }
  if (err instanceof Error) return err.message.slice(0, 2000);
  return String(err).slice(0, 2000);
}

function joinLists(listIds: string[]): string {
  return listIds.join(',');
}

/**
 * Reconciles the AC campaign for a post against its `scheduledPublishDate`.
 * One campaign per post, targeting a list set derived from the post's group
 * category. Re-runs are idempotent: nothing happens when state already
 * matches the target date.
 *
 * Decision tree (matches plan):
 *   1. Guards: suppressNewsletter / no scheduledPublishDate / steady 'sent'.
 *   2. No-change short-circuit: existing scheduled campaign + same date.
 *   3. Post-send edit attempt: 'sent' + date changed → write lastError, no
 *      AC call.
 *   4. No campaign yet → createScheduledCampaign.
 *   5. Campaign exists + date moved → getCampaignStatus first; if frozen,
 *      fall through to branch 3; else updateCampaignSendDate.
 *   6. Any AC error → status='failed', lastError set, campaignId preserved.
 *
 * Never throws — the caller's Payload save must succeed regardless of AC
 * outcome.
 */
export async function syncPostCampaign(
  input: SyncPostCampaignInput,
  deps: SyncPostCampaignDeps = {},
): Promise<SyncOutcome> {
  const create = deps.createScheduledCampaign ?? createScheduledCampaign;
  const reschedule = deps.updateCampaignSendDate ?? updateCampaignSendDate;
  const fetchStatus = deps.getCampaignStatus ?? getCampaignStatus;
  const resolveListIds = deps.resolveListIds ?? resolveCampaignListIds;
  const now = deps.now ?? (() => new Date());

  if (input.suppressNewsletter) {
    return { kind: 'skipped', reason: 'suppressNewsletter' };
  }
  if (!input.scheduledPublishDate || Number.isNaN(input.scheduledPublishDate.getTime())) {
    return { kind: 'skipped', reason: 'no-scheduled-date' };
  }

  const existing = input.acCampaign ?? null;
  const existingStatus = (existing?.status ?? null) as AcCampaignStatus | null;
  const dateUnchanged = sameInstant(existing?.scheduledFor, input.scheduledPublishDate);

  // Steady-state 'sent' with no date change: nothing to do. The campaign has
  // already been delivered; we leave Payload state as-is.
  if (existingStatus === 'sent' && dateUnchanged) {
    return { kind: 'skipped', reason: 'already-sent-unchanged' };
  }

  // Post-send edit attempt: surface a warning, do not call AC.
  if (existingStatus === 'sent' && !dateUnchanged) {
    const nowIso = now().toISOString();
    return {
      kind: 'already-sent',
      state: {
        ...existing,
        lastError: ALREADY_SENT_MESSAGE,
        lastSyncedAt: nowIso,
      },
    };
  }

  // No-op when an existing scheduled campaign already matches the target date.
  if (
    existing?.campaignId &&
    existingStatus === 'scheduled' &&
    dateUnchanged
  ) {
    return { kind: 'skipped', reason: 'no-change' };
  }

  let listIds: string[];
  try {
    listIds = resolveListIds(input.groupCategory);
  } catch (err) {
    return {
      kind: 'failed',
      state: {
        ...existing,
        status: 'failed',
        lastError: describeError(err),
        lastSyncedAt: now().toISOString(),
      },
      error: err,
    };
  }

  // Branch 5: campaign already exists — try to update its send date.
  if (existing?.campaignId) {
    try {
      const { status } = await fetchStatus({ campaignId: existing.campaignId });
      if (isCampaignFrozen(status)) {
        const nowIso = now().toISOString();
        return {
          kind: 'already-sent',
          state: {
            ...existing,
            status: 'sent',
            lastError: ALREADY_SENT_MESSAGE,
            lastSyncedAt: nowIso,
          },
        };
      }
      const { scheduledFor } = await reschedule({
        campaignId: existing.campaignId,
        scheduledSendAt: input.scheduledPublishDate,
      });
      const nowIso = now().toISOString();
      return {
        kind: 'rescheduled',
        state: {
          ...existing,
          status: 'scheduled',
          scheduledFor: scheduledFor.toISOString(),
          lastSyncedAt: nowIso,
          lastError: null,
        },
      };
    } catch (err) {
      return {
        kind: 'failed',
        state: {
          ...existing,
          status: 'failed',
          lastError: describeError(err),
          lastSyncedAt: now().toISOString(),
        },
        error: err,
      };
    }
  }

  // Branch 4: no campaign yet — create one.
  try {
    const result = await create({
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      slug: input.slug,
      listIds,
      scheduledSendAt: input.scheduledPublishDate,
    });
    const nowIso = now().toISOString();
    const wasRetry = existingStatus === 'failed';
    return {
      kind: wasRetry ? 'retried' : 'created',
      state: {
        campaignId: result.campaignId,
        messageId: result.messageId,
        scheduledFor: result.scheduledFor.toISOString(),
        status: 'scheduled',
        targetedLists: joinLists(result.listIds),
        lastSyncedAt: nowIso,
        lastError: null,
      },
    };
  } catch (err) {
    return {
      kind: 'failed',
      state: {
        ...existing,
        status: 'failed',
        lastError: describeError(err),
        lastSyncedAt: now().toISOString(),
      },
      error: err,
    };
  }
}
