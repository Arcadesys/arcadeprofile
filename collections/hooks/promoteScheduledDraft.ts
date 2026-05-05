// If an editor sets a Scheduled Publish Date but leaves Workflow Status on the
// "Not queued" default, the cron's `publish_status === 'scheduled'` filter
// will never pick the post up. Treat "has a scheduled date + still draft" as
// the editor's intent to schedule.
export function promoteScheduledDraftHook<T extends Record<string, any> | undefined>(
  args: { data: T },
): T {
  const { data } = args;
  if (data?.scheduledPublishDate && (!data.publish_status || data.publish_status === 'draft')) {
    data.publish_status = 'scheduled';
  }
  return data;
}
