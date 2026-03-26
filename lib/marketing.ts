import fs from 'fs';
import path from 'path';

const MARKETING_DIR = path.join(process.cwd(), 'data', 'marketing');

export interface SocialPostRecord {
  postedAt: string;
  postUri: string;
  variant: 'short' | 'long';
}

export interface MarketingData {
  newsletterBlurb?: string;
  social?: {
    short?: string;
    long?: string;
    bluesky?: SocialPostRecord;
  };
}

export function readMarketing(slug: string): MarketingData | null {
  const filePath = path.join(MARKETING_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
