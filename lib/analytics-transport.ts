/** Bounded, memory-only delivery. Callers freeze UUID/timestamp/body once.
 * No beacon blind resend, navigation wait, offline persistence, or heartbeat.
 */
export function createAnalyticsTransport(options: {
  fetch: typeof fetch;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
  allowed: () => boolean;
}) {
  type Receipt = { url: string; body: string; attempts: number; pending: boolean; timer?: number };
  const queue = new Set<Receipt>();
  const remove = (receipt: Receipt) => {
    if (receipt.timer !== undefined) options.cancel(receipt.timer);
    queue.delete(receipt);
  };
  async function attempt(receipt: Receipt) {
    if (receipt.pending || !queue.has(receipt)) return;
    if (!options.allowed()) { remove(receipt); return; }
    if (receipt.timer !== undefined) options.cancel(receipt.timer);
    receipt.timer = undefined;
    receipt.pending = true;
    receipt.attempts++;
    const controller = new AbortController();
    const timeout = options.schedule(() => controller.abort(), 5000);
    let retry = false;
    try {
      const response = await options.fetch(receipt.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: receipt.body, keepalive: true, signal: controller.signal,
      });
      retry = [408, 429].includes(response.status) || response.status >= 500;
    } catch { retry = true; }
    finally { options.cancel(timeout); receipt.pending = false; }
    if (retry && receipt.attempts < 3 && options.allowed()) {
      receipt.timer = options.schedule(() => { void attempt(receipt); }, receipt.attempts === 1 ? 250 : 1000);
    } else remove(receipt);
  }
  return {
    send(url: string, body: string) {
      if (queue.size >= 32 || !options.allowed()) return;
      const receipt: Receipt = { url, body, attempts: 0, pending: false };
      queue.add(receipt);
      void attempt(receipt);
    },
    flush() { for (const receipt of queue) void attempt(receipt); },
  };
}
