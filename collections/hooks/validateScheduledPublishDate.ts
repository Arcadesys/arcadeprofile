import type { CollectionBeforeChangeHook } from 'payload';
import { ValidationError } from 'payload';

/**
 * Rejects saves where `scheduledPublishDate` is in the past on a post that is
 * being *scheduled*. This catches an editor queuing a post with a past time,
 * which the scheduled publish job would otherwise publish and email on its
 * next run with no chance to spot the misclick.
 *
 * Only the `scheduled` status is guarded. Drafts pass through so editors can
 * stage a post and fill in the date later. `published` and `sent` are terminal
 * states where a past `scheduledPublishDate` is expected and correct — notably,
 * the publish-scheduled cron promotes a `scheduled` post to `published` exactly
 * when its date has just elapsed, so guarding those states would block the
 * scheduler from ever publishing anything.
 */
export const validateScheduledPublishDateHook: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  if (!data) return data;

  // A partial update may omit publish_status; fall back to the stored value so
  // editing only the date on an already-`scheduled` post is still guarded.
  const status =
    typeof (data as { publish_status?: unknown }).publish_status === 'string'
      ? (data as { publish_status: string }).publish_status
      : (originalDoc as { publish_status?: string } | undefined)?.publish_status || 'draft';
  if (status !== 'scheduled') return data;

  const raw = (data as { scheduledPublishDate?: unknown }).scheduledPublishDate;
  if (!raw || typeof raw !== 'string') return data;

  const scheduled = new Date(raw);
  if (Number.isNaN(scheduled.getTime())) return data;

  if (scheduled.getTime() < Date.now()) {
    throw new ValidationError({
      collection: 'posts',
      errors: [
        {
          path: 'scheduledPublishDate',
          message:
            'Scheduled Publish Date is in the past. Pick a future time, or set Workflow Status to "Not queued" to keep it as a draft.',
        },
      ],
    });
  }
  return data;
};
