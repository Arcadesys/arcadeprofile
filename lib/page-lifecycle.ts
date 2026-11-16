import { SESSION_IDLE_MS } from '@/lib/analytics-session';

export type PageLeave = { lifecycle_reason: 'navigation' | 'unmount' | 'pagehide'; visible_seconds: number; $prev_pageview_duration: number };

/** One terminal leave per visit; BFCache restoration is a new visit.
 * Visibility only pauses a separate visible-time estimate, never emits a view.
 * Elapsed time is not active reading; no timer, DOM text, or activity logging.
 */
export function observePageLifecycle(win: Window, doc: Document, open: () => ((snapshot: PageLeave) => void) | null) {
  let close: ReturnType<typeof open> = null;
  let startedAt = 0;
  let previous = 0;
  let visibleMs = 0;
  let visible = false;
  let invalid = false;
  let stopped = false;
  const begin = () => {
    close = open(); startedAt = previous = win.performance.now();
    visibleMs = 0; visible = doc.visibilityState === 'visible'; invalid = false;
  };
  const advance = () => {
    const now = win.performance.now();
    const delta = now - previous;
    if (!Number.isFinite(delta) || delta < 0) invalid = true;
    else if (visible) visibleMs = Math.min(SESSION_IDLE_MS, visibleMs + delta);
    previous = now;
    return now - startedAt;
  };
  const finish = (reason: PageLeave['lifecycle_reason']) => {
    if (!close) return;
    const send = close; close = null;
    const elapsed = advance();
    // A suspended/stale visit cannot extend a fresh session or invent duration.
    if (invalid || elapsed < 0 || elapsed >= SESSION_IDLE_MS) return;
    send({ lifecycle_reason: reason, visible_seconds: Math.floor(visibleMs / 1000), $prev_pageview_duration: Math.round(elapsed) / 1000 });
  };
  const visibility = () => { if (close) { advance(); visible = doc.visibilityState === 'visible'; } };
  const hide = () => finish('pagehide');
  const restore = (event: PageTransitionEvent) => { if (event.persisted && !stopped && !close) begin(); };
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('pagehide', hide);
  win.addEventListener('pageshow', restore);
  begin();
  return (reason: PageLeave['lifecycle_reason'] = 'navigation') => {
    if (stopped) return;
    stopped = true; finish(reason);
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('pagehide', hide);
    win.removeEventListener('pageshow', restore);
  };
}
