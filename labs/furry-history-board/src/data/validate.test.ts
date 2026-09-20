import { describe, expect, it } from "vitest";
import { historyDataset } from "./seed";
import { comparisonError, validateDataset } from "./validate";

describe("history dataset", () => {
  it("has a valid source-backed seed", () => expect(validateDataset(historyDataset)).toEqual([]));
  it("rejects incompatible literal comparisons", () => expect(comparisonError([historyDataset.places[0].measurements[0], historyDataset.places[4].measurements[0]])).toContain("incompatible"));
  it("keeps counts separate from nonliteral indices", () => expect(historyDataset.edges.every((edge) => edge.metric === "relative_prominence_index")).toBe(true));
  it("validates five editorial trajectories", () => expect(historyDataset.prominenceSeries).toHaveLength(5));
  it("keeps the bounded sampler and all four domains represented", () => {
    const measurements = [
      ...historyDataset.places.flatMap((place) => place.measurements),
      ...historyDataset.events.flatMap((event) => event.measurements),
    ];

    expect(historyDataset.events.length).toBeGreaterThanOrEqual(8);
    expect(historyDataset.events.length).toBeLessThanOrEqual(12);
    expect(historyDataset.places.length).toBeGreaterThanOrEqual(6);
    expect(historyDataset.places.length).toBeLessThanOrEqual(10);
    expect(measurements.length).toBeGreaterThanOrEqual(15);
    expect(measurements.length).toBeLessThanOrEqual(25);
    expect(historyDataset.edges.length).toBeGreaterThanOrEqual(10);
    expect(historyDataset.edges.length).toBeLessThanOrEqual(15);
    expect(historyDataset.places.some((place) => ["platform", "online-community"].includes(place.kind))).toBe(true);
    expect(historyDataset.places.some((place) => place.id === "rowrbrazzle")).toBe(true);
    expect(historyDataset.places.some((place) => place.kind === "convention")).toBe(true);
    expect(historyDataset.people.length).toBeGreaterThan(0);
  });
});

