export type GiftFile = { url: string; filename: string; label: string };
export type SubscriberGift = { title: string; description: string; files: GiftFile[] };

// The gift edition is offered to subscribers; an earlier Toonpunk version is public.
export const SUBSCRIBER_GIFT: SubscriberGift = { title: 'Broomsticks', description: "The opening story of Estelle's Children, forthcoming from Free Play Publishing — early, for subscribers only.", files: [{ url: '/lead-magnets/broomsticks.pdf', filename: 'broomsticks.pdf', label: 'PDF' }, { url: '/lead-magnets/broomsticks.epub', filename: 'broomsticks.epub', label: 'EPUB' }] };

// Placeholder URLs must never become live download links, in HTML or the API.
export function subscriberGiftFiles(gift: SubscriberGift = SUBSCRIBER_GIFT): GiftFile[] {
  if (!gift.files.length || gift.files.some(({ url }) => {
    if (/[\[\]\s]/.test(url)) return true;
    if (url.startsWith('/') && !url.startsWith('//')) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol !== 'https:' || parsed.hostname.endsWith('.invalid');
    } catch {
      return true;
    }
  })) return [];
  return gift.files;
}
