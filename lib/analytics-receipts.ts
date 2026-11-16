/** Per-instance, bounded in-memory coalescing of concurrent/successful receipts.
 * Only hashes/UUIDs and status live here, for two minutes. Cross-instance retries
 * still rely on the unchanged provider UUID tuple (eventual deduplication).
 */
export function createReceiptCache<T>(now = Date.now) {
  const entries = new Map<string, { hash: string; expires: number; result: Promise<T> }>();
  return async (key: string, hash: string, forward: () => Promise<T>, accepted: (result: T) => boolean): Promise<T | null> => {
    for (const [id, entry] of entries) if (entry.expires <= now()) entries.delete(id);
    const previous = entries.get(key);
    if (previous) return previous.hash === hash ? previous.result : null;
    if (entries.size >= 512) return forward();
    const result = forward();
    const entry = { hash, expires: now() + 120_000, result };
    entries.set(key, entry);
    try {
      const response = await result;
      if (!accepted(response)) entries.delete(key);
      return response;
    } catch (error) { entries.delete(key); throw error; }
  };
}
