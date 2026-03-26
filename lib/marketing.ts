import fs from 'fs';
import path from 'path';

const MARKETING_DIR = path.join(process.cwd(), 'data', 'marketing');

export interface SocialPostRecord {
  postedAt: string;
  postUri: string;
  variant: string;
}

export interface ChannelVariant {
  text: string;
  generatedAt?: string;
}

export interface MarketingData {
  channels?: Record<string, ChannelVariant>;
  posted?: Record<string, SocialPostRecord>;
  // Legacy fields — kept for backward-compat reads
  newsletterBlurb?: string;
  social?: {
    short?: string;
    long?: string;
    bluesky?: SocialPostRecord;
  };
}

export const SUPPORTED_CHANNELS = ['bluesky', 'newsletter'] as const;
export type Channel = (typeof SUPPORTED_CHANNELS)[number];

/**
 * Migrate legacy flat format to per-channel variant model.
 * Returns a new object with channels populated from old fields.
 * Leaves legacy fields intact so the file can be re-read by old code.
 */
export function migrateMarketing(data: MarketingData): MarketingData {
  if (data.channels) return data; // already migrated

  const channels: Record<string, ChannelVariant> = {};
  const posted: Record<string, SocialPostRecord> = {};

  // social.short -> channels.bluesky (best fit for 300-char limit)
  if (data.social?.short) {
    channels.bluesky = { text: data.social.short };
  } else if (data.social?.long) {
    channels.bluesky = { text: data.social.long };
  }

  if (data.newsletterBlurb) {
    channels.newsletter = { text: data.newsletterBlurb };
  }

  if (data.social?.bluesky) {
    posted.bluesky = data.social.bluesky;
  }

  return {
    ...data,
    channels: Object.keys(channels).length > 0 ? channels : undefined,
    posted: Object.keys(posted).length > 0 ? posted : undefined,
  };
}

export function readMarketing(slug: string): MarketingData | null {
  const filePath = path.join(MARKETING_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return migrateMarketing(raw);
  } catch {
    return null;
  }
}

export function writeMarketing(slug: string, data: MarketingData): void {
  if (!fs.existsSync(MARKETING_DIR)) {
    fs.mkdirSync(MARKETING_DIR, { recursive: true });
  }
  const filePath = path.join(MARKETING_DIR, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
