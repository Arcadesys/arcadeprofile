/** Tab-local sessions: no shared cookie, cross-tab or cross-site identity. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
export const SESSION_VERSION = 2;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AnalyticsSession = { version: 2; id: string; startedAt: number; lastActivityAt: number };

export function isAnalyticsSessionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V7.test(value);
}

export function uuidV7(now = Date.now()) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let timestamp = now;
  for (let index = 5; index >= 0; index--) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validSession(value: unknown, now: number): value is AnalyticsSession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Partial<AnalyticsSession>;
  return session.version === SESSION_VERSION && isAnalyticsSessionId(session.id)
    && Number.isSafeInteger(session.startedAt) && Number.isSafeInteger(session.lastActivityAt)
    && session.startedAt! === Number.parseInt(session.id.replaceAll('-', '').slice(0, 12), 16)
    && session.startedAt! <= session.lastActivityAt! && session.lastActivityAt! <= now
    && now - session.startedAt! < SESSION_MAX_MS && now - session.lastActivityAt! < SESSION_IDLE_MS;
}

/** Tab memory is authoritative after capture; storage bootstraps a page reload. */
export function readAnalyticsSession(storage: Pick<Storage, 'getItem' | 'setItem'> | null, key: string, fallback?: AnalyticsSession, now = Date.now()) {
  let previous: unknown = fallback;
  // A readable old record can survive quota/read-only write failures. Never
  // replace the tab's newer activity or migrated session with that stale record.
  if (fallback === undefined) {
    try {
      const saved = storage?.getItem(key);
      if (saved) previous = JSON.parse(saved);
    } catch { /* Create a fresh tab session. */ }
  }
  const rotated = !validSession(previous, now);
  const session: AnalyticsSession = rotated
    ? { version: SESSION_VERSION, id: uuidV7(now), startedAt: now, lastActivityAt: now }
    : { version: SESSION_VERSION, id: (previous as AnalyticsSession).id, startedAt: (previous as AnalyticsSession).startedAt, lastActivityAt: now };
  try { storage?.setItem(key, JSON.stringify(session)); } catch { /* Best effort. */ }
  return { session, rotated };
}
