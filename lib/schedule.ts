import fs from 'fs';
import path from 'path';

const SCHEDULE_PATH = path.join(process.cwd(), 'data', 'schedule.json');

export interface ScheduledPost {
  slug: string;
  status: 'draft' | 'scheduled' | 'published' | 'sent';
  scheduledDate: string | null;
  tags: string[];
}

export interface ScheduleSettings {
  publishDays: string[];
  timezone: string;
}

export interface Schedule {
  posts: ScheduledPost[];
  settings: ScheduleSettings;
}

export function readSchedule(): Schedule {
  const raw = fs.readFileSync(SCHEDULE_PATH, 'utf8');
  return JSON.parse(raw);
}

export function writeSchedule(schedule: Schedule): void {
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2) + '\n', 'utf8');
}

/** Get the next N available publish dates starting from a given date */
export function getNextPublishDates(from: Date, count: number, publishDays: string[]): Date[] {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const allowedDays = new Set(publishDays.map(d => d.toLowerCase()));
  const dates: Date[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    if (allowedDays.has(dayNames[current.getDay()])) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
