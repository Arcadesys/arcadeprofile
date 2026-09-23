'use client';

import { useEffect, useRef } from 'react';

export default function KitSignup() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    function repairFormSemantics() {
      const form = host?.querySelector('form[data-uid="873b2f9c39"]');
      const email = form?.querySelector<HTMLInputElement>('input[name="email_address"]');
      if (!form || !email) return;
      form.setAttribute('aria-labelledby', 'signup-title');
      email.type = 'email';
      email.id = 'queer-columns-email';
      if (!form.querySelector('label[for="queer-columns-email"]')) {
        const label = document.createElement('label');
        label.htmlFor = 'queer-columns-email';
        label.textContent = 'Email address';
        email.parentElement?.prepend(label);
      }
    }

    const observer = new MutationObserver(repairFormSemantics);
    observer.observe(host, { childList: true, subtree: true });

    const script = document.createElement('script');
    script.async = true;
    script.dataset.uid = '873b2f9c39';
    script.src = 'https://austen-tucker.kit.com/873b2f9c39/index.js';
    host.appendChild(script);

    return () => {
      observer.disconnect();
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} />;
}
