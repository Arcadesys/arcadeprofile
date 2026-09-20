import { describe, expect, test } from "vitest";
import { parseQuery } from "./parser";

describe("parseQuery", () => {
  test("parses intent, entity, and an exact year", () => {
    expect(parseQuery("When did Fur Affinity become dominant? 2008")).toMatchObject({
      intent: "timeline", lens: "Overview", yearStart: 2008, yearEnd: 2008, entities: ["Fur Affinity"],
    });
  });
  test("accepts exact lens names and ranges", () => {
    expect(parseQuery("Publishing from 2004-2012")).toMatchObject({ intent: "timeline", lens: "Publishing", yearStart: 2004, yearEnd: 2012, text: "from" });
  });
  test("treats a lens and date range as a timeline query", () => {
    expect(parseQuery("Conventions 2020-2024")).toMatchObject({ intent: "timeline", lens: "Conventions", yearStart: 2020, yearEnd: 2024 });
  });
  test("clamps outside years and warns", () => {
    const result = parseQuery("Internet 2038");
    expect(result.yearStart).toBe(2026);
    expect(result.yearEnd).toBe(2026);
    expect(result.warnings[0]).toContain("2038");
  });
  test("normalizes reversed ranges without silently hiding it", () => {
    const result = parseQuery("People 2020-2010");
    expect(result).toMatchObject({ yearStart: 2010, yearEnd: 2020, lens: "People" });
    expect(result.warnings[0]).toContain("reversed");
  });
  test("does not infer a lens from an unrelated word", () => {
    expect(parseQuery("Tell me about history").lens).toBe("Overview");
  });
});

