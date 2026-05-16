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

  // Single selector to avoid running multiple field-state walks per form
  // change. `sentAudiences` walks every key so it's especially worth keeping
  // inside one pass.
  const { publishStatus, suppressNewsletter, publishedDate, sentAudiences } = useFormFields(
    ([fields]) => {
      const f = (fields ?? {}) as Record<string, { value?: unknown }>;
      const audiences = new Set<string>();
      for (const key of Object.keys(f)) {
        if (!/^newsletterSends\.\d+\.audience$/.test(key)) continue;
        const v = f[key]?.value;
        if (typeof v === 'string') audiences.add(v);
      }
      const publishStatusValue = f.publish_status?.value;
      const publishedDateValue = f.publishedDate?.value;
      return {
        publishStatus: typeof publishStatusValue === 'string' ? publishStatusValue : '',
        suppressNewsletter: f.suppressNewsletter?.value === true,
        publishedDate: typeof publishedDateValue === 'string' ? publishedDateValue : '',
        sentAudiences: audiences,
      };
    },
  );

  const disabled = (operation === 'update' && !modified) || uploadStatus === 'uploading';

  const confirmBeforeSubmit = useCallback((): boolean => {
    // Mirror the afterChange hook in collections/Posts.ts: it bails when
    // publish_status === 'sent' (rollup state — all audiences already
    // delivered), so the dialog must too. Only 'published' triggers AC calls.
    const willPublish = publishStatus === 'published';
    // Fan-out targets 'all' plus one of ('fiction' | 'essays'). If both
    // buckets are already recorded as sent, the hook makes no AC calls. The
    // group's category isn't known client-side, so treat the save as
    // "will send" whenever either 'all' or any category audience is missing.
    const allCovered =
      sentAudiences.has('all') &&
      (sentAudiences.has('fiction') || sentAudiences.has('essays'));
    const willSchedule = willPublish && !suppressNewsletter && !allCovered;

    if (!willSchedule) return true;

    let mode = 'now';
    if (publishedDate) {
      const ts = new Date(publishedDate).getTime();
      if (!Number.isNaN(ts) && ts > Date.now()) {
        mode = `scheduled for ${formatLocal(new Date(publishedDate))}`;
      }
    }
    const msg =
      `Are you sure you want to do this? This will schedule an email to be sent (${mode}).\n\n` +
      `To leave it in draft instead, set Workflow Status to "Not queued" or check "Suppress newsletter".`;
    return window.confirm(msg);
  }, [publishStatus, suppressNewsletter, publishedDate, sentAudiences]);

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
