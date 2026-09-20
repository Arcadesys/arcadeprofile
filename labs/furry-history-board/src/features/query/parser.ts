import { LENS_LABELS, type LensLabel } from "../../shared/lenses";

export type QueryIntent = "timeline" | "places" | "compare" | "explain" | "unknown";

export type ParsedQuery = {
  raw: string;
  text: string;
  intent: QueryIntent;
  lens: LensLabel;
  yearStart: number;
  yearEnd: number;
  explicitYear: boolean;
  entities: string[];
  warnings: string[];
};

export const HISTORY_START = 1994;
export const HISTORY_END = 2026;

const LENS_ALIASES: Record<string, LensLabel> = {
  overview: "Overview",
  internet: "Internet",
  online: "Internet",
  publishing: "Publishing",
  publication: "Publishing",
  conventions: "Conventions",
  convention: "Conventions",
  people: "People",
  person: "People",
};

const ENTITY_ALIASES: Record<string, string> = {
  "fur affinity": "Fur Affinity",
  furaffinity: "Fur Affinity",
  yerf: "Yerf",
  livejournal: "LiveJournal",
  twitter: "Twitter",
  discord: "Discord",
  anthrocon: "Anthrocon",
  "further confusion": "Further Confusion",
  eurofurence: "Eurofurence",
};

function clampYear(year: number) {
  return Math.min(HISTORY_END, Math.max(HISTORY_START, year));
}

function parseYears(input: string) {
  const range = input.match(/\b(\d{4})\s*(?:[-–—]|to)\s*(\d{4})\b/i);
  if (range) return { start: Number(range[1]), end: Number(range[2]), match: range[0] };
  const between = input.match(/\bbetween\s+(\d{4})\s+and\s+(\d{4})\b/i);
  if (between) return { start: Number(between[1]), end: Number(between[2]), match: between[0] };
  const single = input.match(/\b(\d{4})\b/);
  return single ? { start: Number(single[1]), end: Number(single[1]), match: single[0] } : null;
}

function intentFor(text: string): QueryIntent {
  if (!text.trim()) return "unknown";
  if (/\b(compare|versus|vs\.?|difference|relative)\b/i.test(text)) return "compare";
  if (/\b(where|which|platform|space|place|online)\b/i.test(text)) return "places";
  if (/\b(when|timeline|over time|history|became|founded|started)\b/i.test(text)) return "timeline";
  if (/\b(why|how|what|source|evidence|explain|according)\b/i.test(text)) return "explain";
  if (/\b(overview|internet|publishing|publication|conventions?|people|person)\b/i.test(text) || /\b\d{4}\b/.test(text)) return "timeline";
  return "unknown";
}

export function parseQuery(rawInput: string): ParsedQuery {
  const raw = rawInput;
  const input = raw.trim();
  const lower = input.toLocaleLowerCase("en-US");
  const warnings: string[] = [];
  const years = parseYears(input);
  let yearStart = HISTORY_START;
  let yearEnd = HISTORY_END;
  let explicitYear = false;
  if (years) {
    explicitYear = true;
    if (years.start > years.end) {
      [years.start, years.end] = [years.end, years.start];
      warnings.push(`Year range reversed; normalized to ${years.start}–${years.end}`);
    }
    if (years.start < HISTORY_START || years.end > HISTORY_END) {
      warnings.push(`Year outside available history: ${years.start === years.end ? years.start : `${years.start}–${years.end}`}`);
    }
    yearStart = clampYear(years.start);
    yearEnd = clampYear(years.end);
  }

  let lens: LensLabel = "Overview";
  for (const label of LENS_LABELS) {
    const alias = Object.entries(LENS_ALIASES).find(([, value]) => value === label)?.[0];
    if (alias && new RegExp(`\\b${alias}\\b`, "i").test(input)) {
      lens = label;
      break;
    }
  }

  const entities = Object.entries(ENTITY_ALIASES)
    .filter(([alias]) => lower.includes(alias))
    .map(([, entity]) => entity)
    .filter((entity, index, all) => all.indexOf(entity) === index);

  let text = input;
  if (years) text = text.replace(years.match, " ");
  for (const alias of Object.keys(LENS_ALIASES)) text = text.replace(new RegExp(`\\b${alias}\\b`, "ig"), " ");
  text = text.replace(/\s+/g, " ").trim();

  return { raw, text, intent: intentFor(input), lens, yearStart, yearEnd, explicitYear, entities, warnings };
}

