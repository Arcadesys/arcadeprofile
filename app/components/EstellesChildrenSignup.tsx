'use client';

import { useEffect, useRef } from 'react';

type EstellesChildrenSignupProps = {
  formId?: string;
};

const host = 'https://atuckercrowder.activehosted.com';

function enhanceForm(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('input, button, label, p, ._form-title, ._form-thank-you, ._error-inner').forEach((element) => {
    element.style.setProperty('font-size', '18px', 'important');
    element.style.setProperty('line-height', '1.55', 'important');
  });

  form.querySelectorAll<HTMLElement>('input[type="text"], input[type="email"], button[type="submit"], ._submit').forEach((element) => {
    element.style.setProperty('min-height', '56px', 'important');
    element.style.setProperty('border', '2px solid currentColor', 'important');
  });

  form.querySelectorAll<HTMLElement>('._form-thank-you, ._form_error, ._error-inner').forEach((element) => {
    element.setAttribute('aria-live', 'polite');
  });

  const email = form.querySelector<HTMLInputElement>('input[name="email"]');
  if (email) {
    email.type = 'email';
    email.autocomplete = 'email';
    email.inputMode = 'email';
  }
}

export default function EstellesChildrenSignup({ formId }: EstellesChildrenSignupProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const validFormId = Boolean(formId && /^\d+$/.test(formId));

  useEffect(() => {
    if (!validFormId || !formId || !slotRef.current) return;

    const slot = slotRef.current;
    const script = document.createElement('script');
    script.src = `${host}/f/embed.php?id=${formId}`;
    script.async = true;
    script.charset = 'utf-8';
    script.addEventListener('load', () => {
      const form = slot.querySelector<HTMLFormElement>(`form._form_${formId}`);
      if (form) enhanceForm(form);
    }, { once: true });
    document.body.append(script);

    return () => {
      script.remove();
      slot.replaceChildren();
    };
  }, [formId, validFormId]);

  if (!validFormId) {
    return (
      <p className="formPending" role="status">
        Reader signup is being prepared. Please check back soon.
      </p>
    );
  }

  return <div ref={slotRef} className={`_form_${formId}`} aria-label="Estelle’s Children Readers signup" />;
}
