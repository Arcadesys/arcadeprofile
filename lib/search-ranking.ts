import type { SearchItem } from '@/lib/search';

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function score(item: SearchItem, terms: string[]): number {
  const title = normalize(item.title);
  const haystack = normalize(item.searchText);
  let total = 0;
  for (const term of terms) {
    if (!haystack.includes(term)) return -1;
    if (title === term) total += 100;
    else if (title.startsWith(term)) total += 35;
    else if (title.includes(term)) total += 20;
    else total += 5;
  }
  return total;
}

export function rankSearchItems(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return items
    .map((item) => ({ item, rank: score(item, terms) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item }) => item);
}
