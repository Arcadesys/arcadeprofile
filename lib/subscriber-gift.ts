export type GiftFile = { url: string; filename: string; label: string };
export type SubscriberGift = { title: string; offerLabel: string; description: string; files: GiftFile[] };

/** Magnets that hand the reader a story file on signup. */
export type GiftMagnet = 'carl' | 'subscriber-exclusive';

// Estelle's Children page only: its opening story, early, for subscribers.
export const BROOMSTICKS_GIFT: SubscriberGift = {
  title: 'Broomsticks',
  offerLabel: 'Subscriber-only',
  description: "The opening story of Estelle's Children, forthcoming from Free Play Publishing — early, for subscribers only.",
  files: [
    { url: '/lead-magnets/broomsticks.pdf', filename: 'broomsticks.pdf', label: 'PDF' },
    { url: '/lead-magnets/broomsticks.epub', filename: 'broomsticks.epub', label: 'EPUB' },
  ],
};

// The sitewide signup gift (Austen's pick, Nov 16, 2026). The PDF is Austen's
// Heinlein edition. The EPUB is built with pandoc from Austen's ebook text, with
// the PDF's cover. Both live in public/lead-magnets/.
export const CARL_GIFT: SubscriberGift = {
  title: 'Carl',
  offerLabel: 'Free when you sign up',
  description: 'An aging android who only knows how to keep working. A bound PDF and ebook edition, free for subscribers.',
  files: [
    { url: '/lead-magnets/carl.pdf', filename: 'carl.pdf', label: 'PDF' },
    { url: '/lead-magnets/carl.epub', filename: 'carl.epub', label: 'EPUB' },
  ],
};

/** The gift most signup boxes offer. */
export const SUBSCRIBER_GIFT: SubscriberGift = CARL_GIFT;

export const GIFT_BY_MAGNET: Record<GiftMagnet, SubscriberGift> = {
  carl: CARL_GIFT,
  'subscriber-exclusive': BROOMSTICKS_GIFT,
};

export function giftForMagnet(magnet: string | undefined | null): SubscriberGift | null {
  return magnet && Object.hasOwn(GIFT_BY_MAGNET, magnet) ? GIFT_BY_MAGNET[magnet as GiftMagnet] : null;
}

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
