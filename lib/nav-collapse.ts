export const NAV_COLLAPSE_STORAGE_KEY = 'arcades-nav-collapsed';

// Runs before hydration so the desktop rail never flashes expanded then collapses.
export const NAV_COLLAPSE_BOOTSTRAP_SCRIPT = `(() => {
  try {
    const saved = window.localStorage.getItem('${NAV_COLLAPSE_STORAGE_KEY}');
    if (saved === 'true') document.documentElement.dataset.navCollapsed = 'true';
  } catch {}
})();`;
