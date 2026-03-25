import fs from 'fs';
import path from 'path';

const SOCIAL_DIR = path.join(process.cwd(), 'data', 'social');
const HISTORY_PATH = path.join(SOCIAL_DIR, 'history.json');

export type SocialPlatform = 'bluesky';
export type PostVariant = 'short' | 'long' | 'custom';
export type SocialPostStatus = 'scheduled' | 'posted' | 'cancelled' | 'failed';

export interface SocialHistoryEntry {
  id: string;
  slug: string | null; // blog post slug, null for standalone posts
  platform: SocialPlatform;
  variant: PostVariant;
  text: string;
  linkUrl?: string;
  status: SocialPostStatus;
  scheduledAt?: string; // ISO datetime for scheduled posts
  postedAt?: string; // ISO datetime when actually posted
  cancelledAt?: string;
  failedAt?: string;
  failureReason?: string;
  postUri?: string; // platform-specific post URI
  postUrl?: string; // web URL to the live post
}

export interface SocialHistory {
  history: SocialHistoryEntry[];
}

function ensureDir() {
  if (!fs.existsSync(SOCIAL_DIR)) {
    fs.mkdirSync(SOCIAL_DIR, { recursive: true });
  }
}

export function readHistory(): SocialHistory {
  ensureDir();
  if (!fs.existsSync(HISTORY_PATH)) {
    return { history: [] };
  }
  const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
  return JSON.parse(raw);
}

export function writeHistory(data: SocialHistory): void {
  ensureDir();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function generateId(): string {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addHistoryEntry(entry: SocialHistoryEntry): void {
  const data = readHistory();
  data.history.unshift(entry); // newest first
  writeHistory(data);
}

export function updateHistoryEntry(id: string, updates: Partial<SocialHistoryEntry>): SocialHistoryEntry | null {
  const data = readHistory();
  const idx = data.history.findIndex(e => e.id === id);
  if (idx === -1) return null;
  data.history[idx] = { ...data.history[idx], ...updates };
  writeHistory(data);
  return data.history[idx];
}

export function getScheduledPosts(): SocialHistoryEntry[] {
  const data = readHistory();
  return data.history.filter(
    e => e.status === 'scheduled' && e.scheduledAt
  );
}

export function getDuePosts(): SocialHistoryEntry[] {
  const now = new Date().toISOString();
  return getScheduledPosts().filter(e => e.scheduledAt! <= now);
}
