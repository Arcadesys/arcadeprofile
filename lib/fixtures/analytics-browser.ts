import type { TestContext } from 'node:test';
import { JSDOM } from 'jsdom';

/** Isolated DOM/environment only. Tests always replace fetch before capture. */
export function analyticsBrowser(t: TestContext, path = '/stories', body = '', referrer = '') {
  const dom = new JSDOM(`<html><head></head><body>${body}</body></html>`, { url: `https://www.thearcades.me${path}`, ...(referrer ? { referrer } : {}) });
  const values = { window: dom.window, document: dom.window.document, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, HTMLDetailsElement: dom.window.HTMLDetailsElement, IS_REACT_ACT_ENVIRONMENT: true };
  for (const [name, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : Reflect.deleteProperty(globalThis, name));
  }
  for (const [name, value] of Object.entries({ NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_VERCEL_ENV: 'production' })) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  }
  t.after(() => dom.window.close());
  return dom;
}
