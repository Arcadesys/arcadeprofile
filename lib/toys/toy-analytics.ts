'use client';

import { track } from '@vercel/analytics/react';

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
  track(name, { toy: toyId, ...properties });
}
