import type { Audience, Magnet, Source, SubscriptionUpdateMode } from '@/lib/subscribe-types';

export type SubscriptionResponse = {
  ok?: boolean;
  error?: string;
  magnet?: { files?: Array<{ url: string; label: string }> };
};

export type SubscriptionRequest = {
  email: string;
  audiences: readonly Audience[];
  source: Source;
  magnet?: Magnet;
  updateMode: SubscriptionUpdateMode;
};

type FetchSubscription = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Calls the first-party subscription API and invokes onSuccess only after its success response. */
export async function submitSubscription(
  request: SubscriptionRequest,
  onSuccess: () => void,
  fetchSubscription: FetchSubscription = fetch,
): Promise<SubscriptionResponse> {
  const response = await fetchSubscription('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await response.json() as SubscriptionResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'Could not subscribe right now. Please try again.');
  }
  onSuccess();
  return payload;
}
