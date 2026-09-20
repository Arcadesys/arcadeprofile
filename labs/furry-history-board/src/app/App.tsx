import { useMemo, useState } from "react";
import { events, historyDataset, prominenceSeries, sources } from "../data/seed";
import type { HistoricalEvent, ProminenceSeries } from "../data/contracts";
import { ProminenceChart } from "../features/chart/ProminenceChart";
import { ProminenceTable } from "../features/chart/ProminenceTable";
import { EvidenceRegion, type EvidenceItem } from "../features/evidence/EvidenceRegion";
import { QueryBar } from "../features/query/QueryBar";
import { parseQuery, type ParsedQuery } from "../features/query/parser";
import { TimelineScrubber } from "../features/timeline/TimelineScrubber";
import { useTheme } from "../features/theme/ThemeProvider";
import { LENS_LABELS, type LensLabel } from "../shared/lenses";

const START_YEAR = 1994;
const END_YEAR = 2026;

const lensEntities: Record<Exclude<LensLabel, "Overview">, readonly string[]> = {
  Internet: ["alt-fan-furry", "furrymuck", "fur-affinity", "furality"],
  Publishing: ["rowrbrazzle", "fur-affinity", "fred-patten", "steve-gallacci", "reed-waller", "kate-worley"],
  Conventions: ["confurence", "anthrocon", "midwest-furfest", "furality"],
  People: ["fred-patten", "steve-gallacci", "mark-merlino", "rod-oriley", "reed-waller", "kate-worley"],
};

const lensSeries: Record<LensLabel, readonly string[]> = {
  Overview: prominenceSeries.map((series) => series.id),
  Internet: ["series-furality"],
  Publishing: ["series-rowrbrazzle"],
  Conventions: ["series-confurence", "series-anthrocon", "series-midwest-furfest", "series-furality"],
  People: ["series-rowrbrazzle", "series-confurence"],
};

const entityIdsByName = new Map([
  ["Fur Affinity", "fur-affinity"],
  ["Anthrocon", "anthrocon"],
  ["Further Confusion", "further-confusion"],
  ["Eurofurence", "eurofurence"],
]);

function yearOf(event: HistoricalEvent) {
  return Number(event.dateStart.slice(0, 4));
}

function eventMatchesLens(event: HistoricalEvent, lens: LensLabel) {
  return lens === "Overview" || event.entities.some((entity) => lensEntities[lens].includes(entity));
}

function eventMatchesQuery(event: HistoricalEvent, query: ParsedQuery) {
  const eventYear = yearOf(event);
  const requestedIds = query.entities.map((entity) => entityIdsByName.get(entity)).filter(Boolean);
  const entityMatch = requestedIds.length === 0 || requestedIds.some((id) => event.entities.includes(id as string));
  return eventYear >= Math.max(START_YEAR, query.yearStart) && eventYear <= query.yearEnd && entityMatch;
}

function closestEvents(items: readonly HistoricalEvent[], year: number) {
  return [...items].sort((a, b) => Math.abs(yearOf(a) - year) - Math.abs(yearOf(b) - year)).slice(0, 3);
}

function summaryFor(query: ParsedQuery, visibleEvents: readonly HistoricalEvent[]) {
  if (!query.raw.trim()) return "Showing the full source-backed sampler from 1994 to 2026.";
  if (query.intent === "unknown") return "That question does not match the prototype’s bounded query grammar. Try a date, a lens, a known place, or a comparison.";
  if (query.entities.includes("Fur Affinity") && /dominant/i.test(query.raw)) return "The available source places Fur Affinity in the sampler in 2005, but it does not provide comparable traffic evidence to establish when the platform became dominant.";
  if (query.intent === "compare" && query.entities.length < 2) return "A comparison needs two recognized places. No unsupported comparison was inferred.";
  if (visibleEvents.length === 0) return "No source-backed records match that question and range. The timeline remains unchanged rather than inventing a result.";
  return `Showing ${visibleEvents.length} source-backed ${query.lens.toLowerCase()} record${visibleEvents.length === 1 ? "" : "s"} from ${query.yearStart} to ${query.yearEnd}.`;
}

function sourceItems(visibleEvents: readonly HistoricalEvent[], series: readonly ProminenceSeries[], selectedYear: number): EvidenceItem[] {
  const support = new Map<string, { confidence: "high" | "medium" | "low"; descriptions: string[] }>();
  for (const event of visibleEvents) for (const evidence of event.evidence) {
    const existing = support.get(evidence.sourceId) ?? { confidence: evidence.confidence, descriptions: [] };
    existing.descriptions.push(evidence.supports);
    support.set(evidence.sourceId, existing);
  }
  for (const item of series) {
    const point = item.points.reduce((best, candidate) => Math.abs(candidate.year - selectedYear) < Math.abs(best.year - selectedYear) ? candidate : best, item.points[0]);
    if (!point) continue;
    for (const sourceId of point.sourceIds) {
      const existing = support.get(sourceId) ?? { confidence: point.confidence, descriptions: [] };
      existing.descriptions.push(point.basis);
      support.set(sourceId, existing);
    }
  }
  const requested = support.size ? sources.filter((source) => support.has(source.id)) : sources.slice(0, 3);
  return requested.map((source) => {
    const details = support.get(source.id);
    return { id: source.id, title: source.title, description: details?.descriptions[0] ?? "Background source for this historical sampler.", confidence: details?.confidence ?? (source.evidenceType === "tertiary" ? "low" : "medium"), href: source.url, locator: source.locator, sourceType: source.evidenceType, available: true };
  });
}

function EventTimeline({ items, selectedYear }: { items: readonly HistoricalEvent[]; selectedYear: number }) {
  const nearby = closestEvents(items, selectedYear);
  return <section className="event-timeline" aria-labelledby="timeline-heading">
    <div className="section-heading-row"><div><h2 id="timeline-heading">Around {selectedYear}</h2><p>Nearest dated records in the selected lens and query range.</p></div><span className="record-count">{items.length} source-backed records</span></div>
    {nearby.length ? <ol>{nearby.map((event) => <li key={event.id} className={yearOf(event) === selectedYear ? "is-current" : undefined}><time dateTime={event.dateStart}>{yearOf(event)}</time><div><h3>{event.title}</h3><p>{event.summary}</p><span>{event.confidence} confidence</span></div></li>)}</ol> : <p className="empty-state">No dated records match this view. Clear the query or choose another lens.</p>}
  </section>;
}

export function App() {
  const { preference, setPreference } = useTheme();
  const initialQuery = useMemo(() => parseQuery("When did Fur Affinity become dominant?"), []);
  const [query, setQuery] = useState(initialQuery);
  const [activeLens, setActiveLens] = useState<LensLabel>("Overview");
  const [selectedYear, setSelectedYear] = useState(2008);
  const [evidenceOpen, setEvidenceOpen] = useState(() => !window.matchMedia("(max-width: 640px)").matches);
  const [tableOpen, setTableOpen] = useState(false);
  const filteredEvents = useMemo(() => events.filter((event) => yearOf(event) >= START_YEAR && eventMatchesLens(event, activeLens) && eventMatchesQuery(event, query)), [activeLens, query]);
  const visibleSeries = useMemo(() => prominenceSeries.filter((series) => lensSeries[activeLens].includes(series.id)), [activeLens]);
  const evidence = useMemo(() => sourceItems(filteredEvents, visibleSeries, selectedYear), [filteredEvents, selectedYear, visibleSeries]);

  function submitQuery(next: ParsedQuery) {
    setQuery(next);
    setActiveLens(next.lens);
    if (next.explicitYear) setSelectedYear(Math.min(next.yearEnd, Math.max(next.yearStart, selectedYear)));
    else if (next.entities.length) {
      const ids = next.entities.map((entity) => entityIdsByName.get(entity));
      const match = events.find((event) => ids.some((id) => id && event.entities.includes(id)));
      if (match) setSelectedYear(Math.min(END_YEAR, Math.max(START_YEAR, yearOf(match))));
    }
  }

  function chooseLens(lens: LensLabel) {
    setActiveLens(lens);
    setQuery((current) => ({ ...current, lens }));
  }

  return <main className="app-shell">
    <header className="site-header">
      <div className="brand-lockup"><h1>Furry History Board</h1><p>An interactive, source-backed observatory of furry history.</p></div>
      <div className="header-actions"><label className="theme-control"><span>Theme</span><select aria-label="Theme preference" value={preference} onChange={(event) => setPreference(event.target.value as typeof preference)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><button type="button" className="about-data-button" aria-expanded={evidenceOpen} onClick={() => setEvidenceOpen((open) => !open)}>About the data</button></div>
    </header>
    <QueryBar initialValue={initialQuery.raw} onSubmit={submitQuery} />
    <section className="query-result" aria-live="polite" aria-label="Query result"><p>{summaryFor(query, filteredEvents)}</p>{query.warnings.map((warning) => <p className="query-warning" key={warning}>{warning}</p>)}</section>
    <nav className="lens-nav" aria-label="Historical lenses">{LENS_LABELS.map((lens) => <button type="button" key={lens} aria-pressed={activeLens === lens} className={activeLens === lens ? "lens-button active" : "lens-button"} onClick={() => chooseLens(lens)}>{lens}</button>)}<p>View history through different lenses.</p></nav>
    <div className={evidenceOpen ? "board-layout evidence-is-open" : "board-layout"}><div className="board-main"><ProminenceChart series={visibleSeries} selectedYear={selectedYear} onSelectedYearChange={setSelectedYear} startYear={START_YEAR} endYear={END_YEAR} /><TimelineScrubber min={START_YEAR} max={END_YEAR} value={selectedYear} onChange={setSelectedYear} /><button type="button" className="table-toggle" aria-expanded={tableOpen} onClick={() => setTableOpen((open) => !open)}>{tableOpen ? "Hide data table" : "View data table"}</button>{tableOpen ? <ProminenceTable series={visibleSeries} /> : null}</div><EvidenceRegion items={evidence} open={evidenceOpen} onOpenChange={setEvidenceOpen} showToggle={false} /></div>
    <EventTimeline items={filteredEvents} selectedYear={selectedYear} />
    <footer className="site-footer"><p>Sampler version {historyDataset.version}. This prototype is intentionally incomplete and preserves uncertainty.</p></footer>
  </main>;
}

