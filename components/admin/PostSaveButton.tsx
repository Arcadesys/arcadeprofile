'use client';

import type { SaveButtonClientProps } from 'payload';

import {
  FormSubmit,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormFields,
  useFormModified,
  useHotkey,
  useOperation,
  useTranslation,
} from '@payloadcms/ui';
import { useCallback, useRef } from 'react';

function formatLocal(date: Date): string {
  try {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
}

export default function PostSaveButton({ label: labelProp }: SaveButtonClientProps) {
  const { uploadStatus } = useDocumentInfo();
  const { t } = useTranslation();
  const { submit } = useForm();
  const modified = useFormModified();
  const operation = useOperation();
  const editDepth = useEditDepth();
  const ref = useRef<HTMLButtonElement>(null);
  const label = labelProp || t('general:save' as Parameters<typeof t>[0]);

  const {
    suppressNewsletter,
    scheduledPublishDate,
    existingCampaignId,
    storedScheduledFor,
    acStatus,
  } = useFormFields(([fields]) => {
    const f = (fields ?? {}) as Record<string, { value?: unknown }>;
    const scheduledRaw = f.scheduledPublishDate?.value;
    const campaignIdRaw = f['acCampaign.campaignId']?.value;
    const statusRaw = f['acCampaign.status']?.value;
    const scheduledForRaw = f['acCampaign.scheduledFor']?.value;
    return {
      suppressNewsletter: f.suppressNewsletter?.value === true,
      scheduledPublishDate: typeof scheduledRaw === 'string' ? scheduledRaw : '',
      existingCampaignId:
        typeof campaignIdRaw === 'string' && campaignIdRaw.trim() !== ''
          ? campaignIdRaw.trim()
          : null,
      storedScheduledFor:
        typeof scheduledForRaw === 'string' ? scheduledForRaw : '',
      acStatus: typeof statusRaw === 'string' ? statusRaw : '',
    };
  });

  const disabled = (operation === 'update' && !modified) || uploadStatus === 'uploading';

  const confirmBeforeSubmit = useCallback((): boolean => {
    // The on-save AC sync provisions a scheduled campaign as soon as
    // scheduledPublishDate is set. Warn the editor whenever the save will
    // create OR reschedule an AC campaign so a misclick on the date picker
    // doesn't silently push subscribers around.
    if (suppressNewsletter) return true;
    if (!scheduledPublishDate) return true;

    const scheduled = new Date(scheduledPublishDate);
    if (Number.isNaN(scheduled.getTime())) return true;

    // If AC already marked the campaign sent, the sync hook is a no-op.
    if (acStatus === 'sent') return true;

    // No-op when the existing scheduled campaign already matches.
    const dateUnchanged =
      existingCampaignId &&
      acStatus === 'scheduled' &&
      storedScheduledFor &&
      Math.abs(new Date(storedScheduledFor).getTime() - scheduled.getTime()) < 1000;
    if (dateUnchanged) return true;

    const when =
      scheduled.getTime() > Date.now()
        ? `scheduled for ${formatLocal(scheduled)}`
        : 'sent immediately (AC clamps past times to now)';

    const verb = existingCampaignId
      ? 'reschedule the existing AC campaign'
      : 'schedule a new AC campaign';

    const msg =
      `This save will ${verb} (${when}).\n\n` +
      `To skip the AC sync, check "Suppress newsletter" or clear Scheduled Publish Date.`;
    return window.confirm(msg);
  }, [suppressNewsletter, scheduledPublishDate, existingCampaignId, storedScheduledFor, acStatus]);

  // Cmd/Ctrl+S mirrors the default SaveButton's hotkey. We re-implement the
  // hotkey here instead of letting it fall through to the original button
  // (which is no longer rendered) so editors keep the same muscle memory.
  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, (e: KeyboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (ref?.current) ref.current.click();
  });

  const handleSubmit = useCallback(() => {
    if (uploadStatus === 'uploading') return;
    if (!confirmBeforeSubmit()) return;
    void submit();
  }, [submit, uploadStatus, confirmBeforeSubmit]);

  return (
    <FormSubmit
      buttonId="action-save"
      disabled={disabled}
      onClick={handleSubmit}
      ref={ref}
      size="medium"
      type="button"
    >
      {label}
    </FormSubmit>
  );
}
