'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import {
  ACTIVE_CAMPAIGN_EMBED_URL,
  ACTIVE_CAMPAIGN_FORM_ID,
  applyPreferenceChange,
  hasAtLeastOnePreference,
  normalizePreferenceLabel,
  type PreferenceKey,
} from '@/lib/activecampaign-form';
import { type Magnet, type Source } from '@/lib/subscribe-types';
import { SITE_NAME } from '@/lib/site-brand';

export type ActiveCampaignFormPresentation = 'default' | 'compact';

export type ActiveCampaignFormProps = {
  source?: Source;
  magnet?: Magnet;
  presentation?: ActiveCampaignFormPresentation;
};

const CHOICE_ERROR = 'Select at least one email preference.';
const SOURCE_FIELD_ID = process.env.NEXT_PUBLIC_AC_SOURCE_FIELD_ID;
const MAGNET_FIELD_ID = process.env.NEXT_PUBLIC_AC_MAGNET_FIELD_ID;

function isFieldId(value: string | undefined): value is string {
  return Boolean(value && /^\d+$/.test(value));
}

function setImportantStyle(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, 'important');
}

function repairCanonicalBranding(form: HTMLFormElement) {
  const walker = document.createTreeWalker(form, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue?.includes('Free Play Publishing')) {
      node.nodeValue = node.nodeValue.replaceAll('Free Play Publishing', SITE_NAME);
    }
    if (node.nodeValue?.includes('Arcades Lab & build logs')) {
      node.nodeValue = node.nodeValue.replaceAll('Arcades Lab & build logs', `${SITE_NAME} & build logs`);
    }
    node = walker.nextNode();
  }
}

function repairAccessiblePresentation(form: HTMLFormElement) {
  repairCanonicalBranding(form);
  setImportantStyle(form, 'width', '100%');
  setImportantStyle(form, 'max-width', '100%');
  setImportantStyle(form, 'margin', '0');
  setImportantStyle(form, 'box-sizing', 'border-box');

  form.querySelectorAll<HTMLElement>('input, textarea, select, button, label, legend, p, ._form-title, ._form-thank-you, ._error-inner').forEach((element) => {
    setImportantStyle(element, 'font-size', '18px');
    setImportantStyle(element, 'line-height', '1.6');
    setImportantStyle(element, 'box-sizing', 'border-box');
    setImportantStyle(element, 'max-width', '100%');
  });

  form.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"], input[type="tel"], input[type="date"], textarea, select').forEach((control) => {
    setImportantStyle(control, 'min-height', '56px');
    setImportantStyle(control, 'padding', '12px 14px');
    setImportantStyle(control, 'background', 'var(--btn-bg)');
    setImportantStyle(control, 'color', 'var(--fg)');
    setImportantStyle(control, 'border', '2px solid var(--border-strong)');
  });

  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"], input[type="radio"]').forEach((control) => {
    setImportantStyle(control, 'width', '28px');
    setImportantStyle(control, 'height', '28px');
    setImportantStyle(control, 'min-width', '28px');
    setImportantStyle(control, 'accent-color', 'var(--neon-pink)');
  });

  form.querySelectorAll<HTMLButtonElement>('button[type="submit"], ._submit').forEach((button) => {
    setImportantStyle(button, 'min-height', '56px');
    setImportantStyle(button, 'padding', '12px 18px');
    setImportantStyle(button, 'font-size', '18px');
  });

  form.querySelectorAll<HTMLElement>('._form-thank-you, ._form_error, ._error-inner').forEach((message) => {
    message.setAttribute('aria-live', 'polite');
  });
}

function addAttributionField(form: HTMLFormElement, fieldId: string | undefined, value: string | undefined) {
  if (!value || !isFieldId(fieldId)) return;

  const name = `field[${fieldId}]`;
  let input = form.querySelector<HTMLInputElement>(`input[name="${name}"][data-arcades-attribution]`);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.dataset.arcadesAttribution = 'true';
    form.append(input);
  }
  input.value = value;
}

function findChoices(form: HTMLFormElement): Map<PreferenceKey, HTMLInputElement> {
  const choices = new Map<PreferenceKey, HTMLInputElement>();
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"], input[type="radio"]').forEach((input) => {
    const label = input.id ? form.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(input.id)}"]`) : null;
    const key = normalizePreferenceLabel(label?.textContent ?? input.value);
    if (key) choices.set(key, input);
  });
  return choices;
}

function configureForm(
  form: HTMLFormElement,
  source: Source | undefined,
  magnet: Magnet | undefined,
) {
  repairAccessiblePresentation(form);
  const email = form.querySelector<HTMLInputElement>('input[name="email"]');
  if (email) {
    email.type = 'email';
    email.autocomplete = 'email';
    email.inputMode = 'email';
  }

  addAttributionField(form, SOURCE_FIELD_ID, source);
  addAttributionField(form, MAGNET_FIELD_ID, magnet);

  const choices = findChoices(form);
  const choiceInputs = [...choices.values()];
  if (choiceInputs.length === 0) return () => undefined;

  const selected = () => new Set(
    [...choices.entries()]
      .filter(([, input]) => input.checked)
      .map(([key]) => key),
  );

  const apply = (next: ReadonlySet<PreferenceKey>) => {
    choices.forEach((input, key) => {
      input.checked = next.has(key);
      input.setCustomValidity(hasAtLeastOnePreference(next) ? '' : CHOICE_ERROR);
    });
  };

  if (!hasAtLeastOnePreference(selected())) apply(new Set<PreferenceKey>(['all']));
  else apply(selected());

  const onChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const key = [...choices.entries()].find(([, candidate]) => candidate === input)?.[0];
    if (!key) return;
    apply(applyPreferenceChange(selected(), key, input.checked));
  };

  const onSubmit = (event: Event) => {
    const current = selected();
    if (hasAtLeastOnePreference(current)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    apply(current);
    choiceInputs[0]?.focus();
    choiceInputs[0]?.reportValidity();
  };

  choiceInputs.forEach((input) => input.addEventListener('change', onChange));
  form.addEventListener('submit', onSubmit, true);

  return () => {
    choiceInputs.forEach((input) => input.removeEventListener('change', onChange));
    form.removeEventListener('submit', onSubmit, true);
  };
}

export default function ActiveCampaignForm({
  source,
  magnet,
  presentation = 'default',
}: ActiveCampaignFormProps) {
  const pathname = usePathname();
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    let removeFormListeners: () => void = () => {};
    let observedForm: HTMLFormElement | null = null;
    const configure = () => {
      const form = slot.querySelector<HTMLFormElement>(`form._form_${ACTIVE_CAMPAIGN_FORM_ID}`);
      if (!form || form === observedForm) return;
      removeFormListeners();
      observedForm = form;
      removeFormListeners = configureForm(form, source, magnet);
    };
    const observer = new MutationObserver(configure);
    observer.observe(slot, { childList: true, subtree: true });

    slot.innerHTML = '';
    const script = document.createElement('script');
    script.src = ACTIVE_CAMPAIGN_EMBED_URL;
    script.charset = 'utf-8';
    script.async = true;
    script.addEventListener('load', configure, { once: true });
    document.body.append(script);

    return () => {
      observer.disconnect();
      removeFormListeners();
      script.remove();
      slot.replaceChildren();
    };
  }, [magnet, pathname, source]);

  return (
    <section
      className={`activecampaign-form activecampaign-form--${presentation}`}
      aria-label="Email preferences"
      data-activecampaign-form={ACTIVE_CAMPAIGN_FORM_ID}
      data-source={source}
      data-magnet={magnet}
    >
      <div ref={slotRef} className={`_form_${ACTIVE_CAMPAIGN_FORM_ID}`} />
    </section>
  );
}
