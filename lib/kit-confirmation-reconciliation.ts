import type { Audience } from './subscribe-types';

export type KitAudienceConfig = { audience: Audience; formId: string; tagId: string };
type KitConfig = { apiKey: string; audiences: KitAudienceConfig[] };
type Fetcher = typeof fetch;
type KitSubscriber = { id?: unknown; state?: unknown };
type KitPage = { subscribers?: unknown; pagination?: { has_next_page?: unknown; end_cursor?: unknown } };

const numericId = /^[1-9]\d*$/;
const pageLimit = 1000;
const maxPages = 100;
const validId = (id: string) => numericId.test(id) && Number.isSafeInteger(Number(id));

async function listActiveFormSubscribers(formId: string, apiKey: string, fetcher: Fetcher) {
  const url = new URL(`https://api.kit.com/v4/forms/${formId}/subscribers`);
  url.searchParams.set('status', 'active');
  url.searchParams.set('slim', 'true');
  url.searchParams.set('per_page', String(pageLimit));
  const subscriberIds = new Set<number>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    if (cursor) url.searchParams.set('after', cursor);
    const response = await fetcher(url, {
      headers: { 'X-Kit-Api-Key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Kit subscriber lookup failed');
    const body = await response.json() as KitPage;
    if (!Array.isArray(body.subscribers)) throw new Error('Kit subscriber response was invalid');
    for (const entry of body.subscribers as KitSubscriber[]) {
      if (typeof entry.id !== 'number' || !Number.isSafeInteger(entry.id) || entry.id <= 0) {
        throw new Error('Kit subscriber response was invalid');
      }
      // The API filter defaults to active and is explicitly requested. Keep this
      // response validation so unexpected provider data fails closed.
      if (entry.state !== 'active') throw new Error('Kit active-form response was invalid');
      subscriberIds.add(entry.id);
    }
    if (typeof body.pagination?.has_next_page !== 'boolean') throw new Error('Kit pagination response was invalid');
    if (!body.pagination.has_next_page) return subscriberIds;
    const nextCursor = body.pagination.end_cursor;
    if (typeof nextCursor !== 'string' || !nextCursor || seenCursors.has(nextCursor)) {
      throw new Error('Kit pagination response was invalid');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    url.searchParams.set('after', cursor);
  }
  throw new Error('Kit pagination limit was reached');
}

async function listTaggedSubscribers(tagId: string, apiKey: string, fetcher: Fetcher) {
  const url = new URL(`https://api.kit.com/v4/tags/${tagId}/subscribers`);
  url.searchParams.set('status', 'all');
  url.searchParams.set('slim', 'true');
  url.searchParams.set('per_page', String(pageLimit));
  const subscriberIds = new Set<number>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    if (cursor) url.searchParams.set('after', cursor);
    const response = await fetcher(url, {
      headers: { 'X-Kit-Api-Key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Kit tag lookup failed');
    const body = await response.json() as KitPage;
    if (!Array.isArray(body.subscribers)) throw new Error('Kit tag response was invalid');
    for (const entry of body.subscribers as KitSubscriber[]) {
      if (typeof entry.id !== 'number' || !Number.isSafeInteger(entry.id) || entry.id <= 0) {
        throw new Error('Kit tag response was invalid');
      }
      if (typeof entry.state !== 'string') throw new Error('Kit tag response was invalid');
      subscriberIds.add(entry.id);
    }
    if (typeof body.pagination?.has_next_page !== 'boolean') throw new Error('Kit pagination response was invalid');
    if (!body.pagination.has_next_page) return subscriberIds;
    const nextCursor = body.pagination.end_cursor;
    if (typeof nextCursor !== 'string' || !nextCursor || seenCursors.has(nextCursor)) {
      throw new Error('Kit pagination response was invalid');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    url.searchParams.set('after', cursor);
  }
  throw new Error('Kit pagination limit was reached');
}

async function addTags(pairs: Array<{ subscriberId: number; tagId: string }>, apiKey: string, fetcher: Fetcher) {
  let added = 0;
  let failed = 0;
  const concurrency = 5;
  for (let offset = 0; offset < pairs.length; offset += concurrency) {
    const responses = await Promise.all(pairs.slice(offset, offset + concurrency).map(async ({ subscriberId, tagId }) => {
      try {
        return await fetcher(`https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
          body: '{}',
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        return null;
      }
    }));
    for (const response of responses) {
      if (response?.ok) added += 1;
      else failed += 1;
    }
  }
  return { added, failed };
}

/** Add audience tags only for subscribers Kit lists as active members of each DOI form. */
export async function reconcileConfirmedKitSubscribers(config: KitConfig, fetcher: Fetcher = fetch) {
  if (!config.apiKey || config.audiences.length !== 4 || config.audiences.some(({ formId, tagId }) => (
    !validId(formId) || !validId(tagId)
  ))) {
    throw new Error('Kit reconciliation configuration is invalid');
  }

  // Finish every read before the first write. An incomplete read therefore
  // cannot produce a partial view where only some audiences get tags.
  const confirmedByAudience = await Promise.all(config.audiences.map(async (entry) => ({
    entry,
    subscriberIds: await listActiveFormSubscribers(entry.formId, config.apiKey, fetcher),
  })));
  const allTagIds = [...new Set(config.audiences.map(({ tagId }) => tagId))];
  const taggedByTag = new Map(await Promise.all(allTagIds.map(async (tagId) => [
    tagId,
    await listTaggedSubscribers(tagId, config.apiKey, fetcher),
  ] as const)));

  const confirmed = confirmedByAudience.reduce((sum, entry) => sum + entry.subscriberIds.size, 0);
  const writes = new Map<string, { subscriberId: number; tagId: string }>();
  let alreadyTagged = 0;
  for (const { entry, subscriberIds } of confirmedByAudience) {
    const existing = taggedByTag.get(entry.tagId)!;
    for (const subscriberId of subscriberIds) {
      if (existing.has(subscriberId)) {
        alreadyTagged += 1;
      } else {
        const key = `${entry.tagId}:${subscriberId}`;
        writes.set(key, { subscriberId, tagId: entry.tagId });
      }
    }
  }
  return { confirmed, alreadyTagged, ...await addTags([...writes.values()], config.apiKey, fetcher) };
}
