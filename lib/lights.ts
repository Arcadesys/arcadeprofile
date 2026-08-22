export const LIGHTS_STORAGE_KEY = 'arcades-lights';

export type LightMode = 'on' | 'off';

const READING_ROOTS = new Set(['/bio', '/resume', '/bibliography']);

function pathSegments(pathname: string): string[] {
  return pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
}

export function getDefaultLightMode(pathname: string): LightMode {
  const cleanPath = `/${pathSegments(pathname).join('/')}`;
  const segments = pathSegments(pathname);

  if (READING_ROOTS.has(cleanPath)) return 'off';
  if (segments[0] === 'preview' && segments.length > 1) return 'off';
  if (segments[0] === 'blog' && segments.length > 1) return 'off';
  if (segments[0] === 'lab' && segments.length > 1) return 'off';
  if (segments[0] === 'portfolio' && segments.length > 1) return 'off';
  if (segments[0] === 'this-is-what-i-do-for-fun' && segments.length > 1) return 'off';
  if (segments[0] === 'projects' && segments.length > 2) return 'off';

  return 'on';
}

export function isLightMode(value: unknown): value is LightMode {
  return value === 'on' || value === 'off';
}

// Runs before hydration so long-form routes never flash the illuminated shell.
export const LIGHTS_BOOTSTRAP_SCRIPT = `(() => {
  const getDefault = (pathname) => {
    const parts = pathname.split('?')[0].split('#')[0].split('/').filter(Boolean);
    const clean = '/' + parts.join('/');
    if (['/bio', '/resume', '/bibliography'].includes(clean)) return 'off';
    if (parts[0] === 'preview' && parts.length > 1) return 'off';
    if (parts[0] === 'blog' && parts.length > 1) return 'off';
    if (parts[0] === 'lab' && parts.length > 1) return 'off';
    if (parts[0] === 'portfolio' && parts.length > 1) return 'off';
    if (parts[0] === 'this-is-what-i-do-for-fun' && parts.length > 1) return 'off';
    if (parts[0] === 'projects' && parts.length > 2) return 'off';
    return 'on';
  };
  let mode = getDefault(window.location.pathname);
  try {
    const saved = window.localStorage.getItem('${LIGHTS_STORAGE_KEY}');
    if (saved === 'on' || saved === 'off') mode = saved;
  } catch {}
  document.documentElement.dataset.lights = mode;
})();`;
