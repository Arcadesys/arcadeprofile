import { z } from 'zod';
import { readKitResource } from './kit-broadcast';

export type KitReportOptions =
  | { mode: 'list'; subject?: string; limit: number; maxPages: number }
  | { mode: 'stats'; id: number }
  | { mode: 'counts'; maxPages: number };
export class KitReportError extends Error {}
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = count.refine((value) => value > 0);
const rate = z.number().finite().nonnegative().nullish();
const date = z.string().refine((value) => Number.isFinite(Date.parse(value))).transform((value) => new Date(value).toISOString());
const pagination = z.object({ has_next_page: z.boolean(), end_cursor: z.string().nullish(), total_count: count.nullish() });
const broadcastsPage = z.object({ broadcasts: z.array(z.object({
  id, subject: z.string().nullable(), status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'aborted']),
  created_at: date, send_at: date.nullable(),
})), pagination });
const tagsPage = z.object({ tags: z.array(z.object({ id, name: z.string(), subscriber_count: count.nullish() })), pagination });
const statsResponse = z.object({ broadcast: z.object({ id, stats: z.object({
  recipients: count.nullish(), open_rate: rate, click_rate: rate, unsubscribes: count.nullish(),
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'aborted']),
  open_tracking_disabled: z.boolean().nullish(), click_tracking_disabled: z.boolean().nullish(),
}) }) });

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new KitReportError('Invalid Kit read-only response. No report was produced.');
  return result.data;
}
// Provider names/subjects can contain addresses; retain only redacted labels.
function label(value: string | null): string | null {
  return value?.replace(/[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+/g, '[redacted address]') ?? null;
}
function nextCursor(page: z.infer<typeof pagination>, seen: Set<string>): string | null {
  if (!page.has_next_page) return null;
  if (!page.end_cursor || seen.has(page.end_cursor)) {
    throw new KitReportError('Invalid or repeated Kit pagination cursor. History/counts may be incomplete; no report was produced.');
  }
  seen.add(page.end_cursor);
  return page.end_cursor;
}

export async function buildKitReport(
  options: KitReportOptions,
  connection: { apiKey: string; fetchImpl?: typeof fetch },
): Promise<unknown> {
  if (options.mode === 'stats') {
    const payload = parse(statsResponse, await readKitResource(connection, `broadcasts/${options.id}/stats`));
    if (payload.broadcast.id !== options.id) throw new KitReportError('Kit stats belong to a different broadcast. No report was produced.');
    const stats = payload.broadcast.stats;
    return { mode: 'stats', broadcastId: payload.broadcast.id, status: stats.status,
      recipients: stats.recipients ?? null, openRate: stats.open_rate ?? null, clickRate: stats.click_rate ?? null,
      unsubscribes: stats.unsubscribes ?? null,
      openTrackingDisabled: stats.open_tracking_disabled ?? null, clickTrackingDisabled: stats.click_tracking_disabled ?? null,
      note: 'Rates are Kit-reported values, unmodified. Null means unavailable. Tracking settings and privacy protections limit interpretation; recipient counts do not prove readership.',
    };
  }
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;
  if (options.mode === 'list') {
    const broadcasts = new Map<number, z.infer<typeof broadcastsPage>['broadcasts'][number]>();
    do {
      const query = new URLSearchParams({ slim: 'true', per_page: '100' });
      if (cursor) query.set('after', cursor);
      const page = parse(broadcastsPage, await readKitResource(connection, 'broadcasts', query));
      for (const item of page.broadcasts) broadcasts.set(item.id, item);
      pages++;
      cursor = nextCursor(page.pagination, seenCursors);
    } while (cursor && pages < options.maxPages);
    const matches = [...broadcasts.values()]
      .filter((item) => !options.subject || item.subject?.toLowerCase().includes(options.subject.toLowerCase()))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
    return { mode: 'list', historyComplete: cursor === null, scannedPages: pages, scannedBroadcasts: broadcasts.size,
      matchingBroadcasts: matches.length, resultsLimited: matches.length > options.limit,
      broadcasts: matches.slice(0, options.limit).map((item) => ({ id: item.id, subject: label(item.subject), status: item.status, createdAt: item.created_at, sendAt: item.send_at })),
      note: 'Newest created first within scanned history. sendAt is the provider schedule/start time, not inbox delivery. Incomplete history or limited results cannot establish that a subject was never sent.',
    };
  }
  // Request one slim record only to obtain aggregate metadata. Never traverse,
  // return, log or persist the subscriber array (which can contain addresses).
  const totals = async (status: 'all' | 'active') => {
    const query = new URLSearchParams({ status, per_page: '1', slim: 'true', include_total_count: 'true' });
    const payload = parse(z.object({ total_count: count.nullish(), pagination: z.object({ total_count: count.nullish() }) }),
      await readKitResource(connection, 'subscribers', query));
    const top = payload.total_count;
    const nested = payload.pagination.total_count;
    if (top != null && nested != null && top !== nested) throw new KitReportError('Conflicting Kit aggregate counts. No report was produced.');
    return nested ?? top ?? null;
  };
  const allSubscribers = await totals('all');
  const activeSubscribers = await totals('active');
  const tags = new Map<number, { id: number; name: string | null; subscriberCount: number | null }>();
  do {
    const query = new URLSearchParams({ include: 'subscriber_count', per_page: '100' });
    if (cursor) query.set('after', cursor);
    const page = parse(tagsPage, await readKitResource(connection, 'tags', query));
    for (const tag of page.tags) tags.set(tag.id, { id: tag.id, name: label(tag.name), subscriberCount: tag.subscriber_count ?? null });
    pages++;
    cursor = nextCursor(page.pagination, seenCursors);
  } while (cursor && pages < options.maxPages);
  return { mode: 'counts', allSubscribers, activeSubscribers, tagsComplete: cursor === null, scannedTagPages: pages,
    tags: [...tags.values()].sort((a, b) => a.id - b.id),
    note: 'Counts only; subscriber records are discarded. Null means unavailable, not zero. Tag counts use Kit subscriber_count (status scope unspecified), can overlap and are not an active OR-audience estimate. Totals are separate reads, not an atomic snapshot.',
  };
}
