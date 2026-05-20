import type { CollectionBeforeChangeHook } from 'payload';
import { ValidationError } from 'payload';

/**
 * Rejects saves where `scheduledPublishDate` is in the past on any post that
 * is not a draft. Drafts pass through so editors can stage a post and only
 * fill in the date later. Anything queued ('scheduled', 'published', 'sent')
 * gets blocked because the AC campaign sync uses `scheduledPublishDate` as
 * the send time, and past dates would mean "send now" with no chance for
 * the editor to spot a misclick.
 */
export const validateScheduledPublishDateHook: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data;

  const status =
    typeof (data as { publish_status?: unknown }).publish_status === 'string'
      ? (data as { publish_status: string }).publish_status
      : 'draft';
  if (status === 'draft') return data;

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
