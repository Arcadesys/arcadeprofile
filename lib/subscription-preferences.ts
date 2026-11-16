import type { Audience } from './subscribe-types';

export type PreferenceKey = Audience;

export const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  all: 'All',
  fiction: 'Fiction',
  essays: 'Essays',
  lab: 'Arcades Lab & build logs',
  'queer-columns': 'Queer Columns',
  'work-ai': 'Work / AI',
  th4f: 'TH4F',
};

export function normalizePreferenceLabel(value: string): PreferenceKey | undefined {
  const label = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (label === 'all') return 'all';
  if (label === 'fiction') return 'fiction';
  if (label === 'essays') return 'essays';
  if (label === 'arcades lab & build logs') return 'lab';
  if (label === 'queer columns') return 'queer-columns';
  if (label === 'work / ai') return 'work-ai';
  if (label === 'th4f') return 'th4f';
  return undefined;
}

export function applyPreferenceChange(
  current: ReadonlySet<PreferenceKey>,
  changed: PreferenceKey,
  checked: boolean,
): Set<PreferenceKey> {
  const next = new Set(current);
  if (checked) next.add(changed);
  else next.delete(changed);

  if (checked && changed === 'all') {
    next.delete('fiction');
    next.delete('essays');
  }
  if (checked && (changed === 'fiction' || changed === 'essays')) {
    next.delete('all');
  }

  return next;
}

export function hasAtLeastOnePreference(selected: ReadonlySet<PreferenceKey>): boolean {
  return selected.size > 0;
}
