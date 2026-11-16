/** Same bounded measurement contract in the three imprints; no shared identity. */
export const ENGAGEMENT_VERSION = 'visible_active_v1';
export const ACTIVE_SECONDS_MAX = 1800;
export const READING_IDLE_MS = 60_000;
const CHECKPOINTS = [30, 120, 300] as const;
export type EngagementSnapshot = {
  engagement_version: typeof ENGAGEMENT_VERSION;
  engagement_checkpoint: '30s' | '120s' | '300s' | 'final';
  active_seconds: number;
  depth_percent: number;
};
type ReadingState = { visible: boolean; focused: boolean; inView: boolean; depth: number };

/** Reject malformed metrics; never forward arbitrary text or properties. */
export function sanitizeEngagement(value: Record<string, unknown>): EngagementSnapshot | null {
  const seconds = value.active_seconds;
  const depth = value.depth_percent;
  const checkpoint = value.engagement_checkpoint;
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 1 || seconds > ACTIVE_SECONDS_MAX
    || typeof depth !== 'number' || ![0, 25, 50, 75, 100].includes(depth)
    || typeof checkpoint !== 'string' || !['30s', '120s', '300s', 'final'].includes(checkpoint)) return null;
  if (checkpoint !== 'final' && seconds < Number.parseInt(String(checkpoint), 10)) return null;
  return { engagement_version: ENGAGEMENT_VERSION, engagement_checkpoint: checkpoint as EngagementSnapshot['engagement_checkpoint'], active_seconds: seconds, depth_percent: depth };
}

/** Cumulative snapshots: use MAX, never SUM. At most 3 milestones + 1 final. */
export function createReadingMeter(now: () => number, send: (value: EngagementSnapshot) => void) {
  let previousTime = now();
  let lastActivity = previousTime; // Arrival permits one minute of quiet reading.
  let state: ReadingState = { visible: false, focused: false, inView: false, depth: 0 };
  let activeMs = 0;
  let depth = 0;
  let ended = false;
  let lastSentSeconds = -1;
  let lastSentDepth = -1;
  const sent = new Set<number>();
  const eligible = () => state.visible && state.focused && state.inView;
  function emit(checkpoint: EngagementSnapshot['engagement_checkpoint']) {
    const seconds = Math.floor(activeMs / 1000);
    if (seconds < 1) return;
    lastSentSeconds = seconds; lastSentDepth = depth;
    try { send({ engagement_version: ENGAGEMENT_VERSION, engagement_checkpoint: checkpoint, active_seconds: seconds, depth_percent: depth }); } catch { /* Never interrupt reading. */ }
  }
  function advance() {
    const time = now();
    const elapsed = time - previousTime;
    // Long timer gaps/suspension are unknown activity, not inferred reading.
    if (eligible() && elapsed >= 0 && elapsed <= 5000) {
      activeMs = Math.min(ACTIVE_SECONDS_MAX * 1000, activeMs + Math.max(0, Math.min(time, lastActivity + READING_IDLE_MS) - previousTime));
    }
    previousTime = time;
    return time;
  }
  return {
    sample(next: ReadingState, activity = false) {
      if (ended) return;
      const time = advance();
      if (activity && next.visible && next.focused) lastActivity = time;
      state = next;
      if (eligible() && time < lastActivity + READING_IDLE_MS && Number.isFinite(next.depth)) {
        depth = Math.max(depth, Math.min(100, Math.max(0, Math.floor(next.depth / 25) * 25)));
      }
      for (const checkpoint of CHECKPOINTS) if (activeMs >= checkpoint * 1000 && !sent.has(checkpoint)) {
        sent.add(checkpoint); emit(`${checkpoint}s`);
      }
    },
    finish() {
      if (ended) return;
      advance(); ended = true;
      if (Math.floor(activeMs / 1000) !== lastSentSeconds || depth !== lastSentDepth) emit('final');
    },
  };
}

/** No storage, DOM text, input values, new identifiers, or network heartbeat. */
export function observeReading(options: {
  window: Window;
  document: Document;
  bounds: () => { top: number; bottom: number } | null;
  send: (value: EngagementSnapshot) => void;
}) {
  const { window: win, document: doc, bounds, send } = options;
  let meter = createReadingMeter(() => win.performance.now(), send);
  let stopped = false;
  const sample = (activity = false) => {
    const rect = bounds();
    const height = rect ? rect.bottom - rect.top : 0;
    const inView = Boolean(rect && height > 0 && rect.bottom > 0 && rect.top < win.innerHeight);
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(doc.activeElement?.tagName ?? '');
    meter.sample({ visible: doc.visibilityState === 'visible', focused: doc.hasFocus() && !editing, inView,
      depth: rect && height > 0 ? (win.innerHeight - rect.top) / height * 100 : 0 }, activity);
  };
  const activity = () => sample(true);
  const visibility = () => sample();
  const focus = () => sample(true);
  const finish = () => { sample(); meter.finish(); };
  const restore = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    meter = createReadingMeter(() => win.performance.now(), send); sample(true);
  };
  doc.addEventListener('visibilitychange', visibility);
  doc.addEventListener('pointerdown', activity, { passive: true });
  doc.addEventListener('keydown', activity);
  win.addEventListener('scroll', activity, { passive: true });
  win.addEventListener('focus', focus);
  win.addEventListener('blur', visibility);
  win.addEventListener('pagehide', finish);
  win.addEventListener('pageshow', restore);
  const timer = win.setInterval(visibility, 1000);
  sample();
  return () => {
    if (stopped) return;
    stopped = true; finish(); win.clearInterval(timer);
    doc.removeEventListener('visibilitychange', visibility);
    doc.removeEventListener('pointerdown', activity);
    doc.removeEventListener('keydown', activity);
    win.removeEventListener('scroll', activity);
    win.removeEventListener('focus', focus);
    win.removeEventListener('blur', visibility);
    win.removeEventListener('pagehide', finish);
    win.removeEventListener('pageshow', restore);
  };
}
