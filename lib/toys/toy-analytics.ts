'use client';

import { track } from '@vercel/analytics/react';
import { canCaptureBrowserAnalytics } from '@/lib/site-analytics';

type ToyEventName =
  | 'toy_started'
  | 'first_choice_made'
  | 'toy_completed'
  | 'toy_restarted'
  | 'next_toy_started';

export function trackToyEvent(
  name: ToyEventName,
  toyId: string,
  properties: Record<string, string | number | boolean> = {},
) {
  if (!canCaptureBrowserAnalytics()) return;
  track(name, { toy: toyId, ...properties });
}
