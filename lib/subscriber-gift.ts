export type GiftFile = { url: string; filename: string; label: string };
export type SubscriberGift = { title: string; description: string; files: GiftFile[] };

// BLOCKED: Austen must supply a NEW subscriber-only piece, not in the book.
// Replace this single assignment with the approved title, description and URLs.
export const SUBSCRIBER_GIFT: SubscriberGift = { title: '[EXCLUSIVE PIECE TITLE]', description: '[ONE-LINE DESCRIPTION]', files: [{ url: '[EXCLUSIVE PIECE PDF URL]', filename: '[EXCLUSIVE PIECE PDF FILENAME]', label: 'PDF' }, { url: '[EXCLUSIVE PIECE EPUB URL]', filename: '[EXCLUSIVE PIECE EPUB FILENAME]', label: 'EPUB' }] };

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
