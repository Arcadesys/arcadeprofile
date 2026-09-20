import type { HistoryDataset, Measurement } from "./contracts";

const dateOk = (value: string) => !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}$/.test(value);
const evidenceOk = (refs: readonly { sourceId: string }[], sourceIds: ReadonlySet<string>) => refs.length > 0 && refs.every((ref) => sourceIds.has(ref.sourceId));

export function validateDataset(dataset: HistoryDataset): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(dataset.sources.map((source) => source.id));
  const entityIds = new Set([...dataset.places, ...dataset.people].map((entity) => entity.id));
  dataset.sources.forEach((source) => { if (!dateOk(source.accessedAt)) errors.push(`source ${source.id}: bad accessedAt`); if (!/^https?:\/\//.test(source.url)) errors.push(`source ${source.id}: bad URL`); });
  const checkMeasurement = (measurement: Measurement) => {
    if (!dateOk(measurement.periodStart) || !dateOk(measurement.periodEnd) || measurement.periodStart > measurement.periodEnd) errors.push(`measurement ${measurement.id}: bad period`);
    if (measurement.value !== undefined && (!Number.isFinite(measurement.value) || measurement.value < 0)) errors.push(`measurement ${measurement.id}: bad value`);
    if (!evidenceOk(measurement.evidence, sourceIds)) errors.push(`measurement ${measurement.id}: missing/dangling evidence`);
    if (measurement.metric === "relative_prominence_index" && !measurement.methodology.toLowerCase().includes("nonliteral")) errors.push(`measurement ${measurement.id}: relative index must be nonliteral`);
  };
  dataset.events.forEach((event) => { if (!dateOk(event.dateStart) || (event.dateEnd && !dateOk(event.dateEnd))) errors.push(`event ${event.id}: bad date`); if (!evidenceOk(event.evidence, sourceIds)) errors.push(`event ${event.id}: missing/dangling evidence`); event.entities.forEach((id) => { if (!entityIds.has(id)) errors.push(`event ${event.id}: dangling entity ${id}`); }); event.measurements.forEach(checkMeasurement); });
  dataset.places.forEach((place) => { if (!evidenceOk(place.evidence, sourceIds)) errors.push(`place ${place.id}: missing/dangling evidence`); place.measurements.forEach(checkMeasurement); });
  dataset.people.forEach((person) => { if (!evidenceOk(person.evidence, sourceIds)) errors.push(`person ${person.id}: missing/dangling evidence`); });
  dataset.edges.forEach((edge) => { if (!entityIds.has(edge.from) || !entityIds.has(edge.to)) errors.push(`edge ${edge.id}: dangling endpoint`); if (!evidenceOk(edge.evidence, sourceIds)) errors.push(`edge ${edge.id}: missing/dangling evidence`); if (edge.displayIndex !== undefined && (edge.displayIndex < 0 || edge.displayIndex > 100)) errors.push(`edge ${edge.id}: index outside 0..100`); });
  dataset.prominenceSeries.forEach((series) => {
    if (series.metric !== "relative_prominence_index" || series.nonliteral !== true) errors.push(`series ${series.id}: must be explicitly nonliteral`);
    if (series.points.length < 2) errors.push(`series ${series.id}: needs trajectory points`);
    series.points.forEach((point) => {
      if (!Number.isInteger(point.year) || point.year < 1994 || point.year > 2026) errors.push(`series ${series.id}: bad year`);
      if (!Number.isFinite(point.value) || point.value < 0 || point.value > 100) errors.push(`series ${series.id}: value outside 0..100`);
      if (!evidenceOk(point.sourceIds.map((sourceId) => ({ sourceId })), sourceIds)) errors.push(`series ${series.id}: missing/dangling sourceIds`);
      if (!point.basis.toLowerCase().includes("editorial") || !point.basis.toLowerCase().includes("nonliteral")) errors.push(`series ${series.id}: point basis must disclose editorial nonliteral index`);
    });
  });
  return errors;
}

export function comparisonError(measurements: readonly Measurement[]): string | undefined {
  if (measurements.length < 2) return undefined;
  const groups = new Set(measurements.map((item) => item.comparableGroup));
  const kinds = new Set(measurements.map((item) => item.metric));
  if (groups.size !== 1 || groups.has(undefined) || kinds.size !== 1) return "Measurements use incompatible metric kinds or methodologies; no literal comparison is valid.";
  return undefined;
}

