export type ShareUrlReason = 'draft' | 'no-group' | 'no-slug' | 'not-found';

export interface ShareUrlResponse {
  url: string | null;
  absoluteUrl: string | null;
  reason?: ShareUrlReason;
}
