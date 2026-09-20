import type { EvidenceRef, HistoricalEvent, HistoryDataset, Measurement, PersonNode, PlaceNode, Source } from "./contracts";

const accessedAt = "2026-09-20" as const;
const source = (id: string, title: string, url: string, evidenceType: Source["evidenceType"], locator?: string): Source => ({ id, title, url, accessedAt, evidenceType, locator });
const ref = (sourceId: string, supports: string, confidence: EvidenceRef["confidence"] = "high"): EvidenceRef => ({ sourceId, supports, confidence });
const measurement = (id: string, metric: Measurement["metric"], value: number | undefined, periodStart: `${number}-${number}-${number}`, methodology: string, evidence: readonly EvidenceRef[], comparableGroup?: string): Measurement => ({ id, metric, value, unit: metric === "page_count" ? "pages" : metric === "membership" ? "members" : metric === "publication_frequency" ? "issues/year" : "attendees", periodStart, periodEnd: periodStart, methodology, comparableGroup, evidence });

export const sources: readonly Source[] = [
  source("anthrocon-history", "Anthrocon history", "https://www.anthrocon.org/history/", "primary"),
  source("furality-history", "Furality history", "https://furality.org/about", "primary"),
  source("mff-about", "What is Midwest FurFest?", "https://www.furfest.org/", "primary"),
  source("confurence-about", "ConFurence Archive", "https://confurence.com/about/", "archival-secondary"),
  source("confurence-2", "ConFurence 2 footage", "https://confurence.com/1991/01/confurence-2-footage/", "primary"),
  source("confurence-5", "ConFurence 5 conbook", "https://confurence.com/1994/01/confurence-five-conbook-1994/", "primary"),
  source("fanlore-aff", "alt.fan.furry", "https://fanlore.org/wiki/Alt.fan.furry", "archival-secondary"),
  source("furrymuck-history", "FurryMUCK history", "https://en.wikipedia.org/wiki/FurryMUCK", "tertiary"),
  source("fa-about", "About Fur Affinity", "https://shop.furaffinity.net/pages/about-furaffinity", "primary"),
  source("ucr-patten", "Fred Patten Papers", "https://library.ucr.edu/collections/fred-patten-papers", "primary"),
  source("con-attendance", "Furry Con Attendance", "https://furryconattendance.com/", "tertiary"),
];

const rowr = ref("confurence-5", "Rowrbrazzle publication and membership details", "high");
const ac = ref("anthrocon-history", "Anthrocon dates and attendance", "high");
const fur = ref("furality-history", "Furality event and attendance history", "high");
const mff = ref("mff-about", "Midwest FurFest history and attendance", "high");
const conf = ref("confurence-about", "ConFurence historical context", "medium");

export const places: readonly PlaceNode[] = [
  { id: "rowrbrazzle", label: "Rowrbrazzle", kind: "website", measurements: [measurement("rowr-members", "membership", 124, "1993-12-01", "reported membership in an archival conbook", [rowr], "publication-membership")], evidence: [rowr] },
  { id: "alt-fan-furry", label: "alt.fan.furry", kind: "online-community", measurements: [measurement("aff-members-unknown", "membership", undefined, "1990-12-18", "No comparable membership count is supplied; value preserved as unknown.", [ref("fanlore-aff", "dedicated Usenet group and archive", "medium")])], evidence: [ref("fanlore-aff", "dedicated Usenet group and archive", "medium")] },
  { id: "furrymuck", label: "FurryMUCK", kind: "platform", measurements: [measurement("furrymuck-members-unknown", "membership", undefined, "1990-11-01", "No comparable membership count is supplied; value preserved as unknown.", [ref("furrymuck-history", "late-1990 TinyMUCK deployment", "low")])], evidence: [ref("furrymuck-history", "late-1990 TinyMUCK deployment", "low")] },
  { id: "confurence", label: "ConFurence", kind: "convention", geography: "Southern California", measurements: [], evidence: [conf] },
  { id: "anthrocon", label: "Anthrocon", kind: "convention", geography: "Pittsburgh", measurements: [measurement("ac-2019", "registered_attendees", 9358, "2019-07-04", "organizer-reported attendance", [ac], "physical-convention-registration"), measurement("ac-2022", "registered_attendees", 9702, "2022-06-30", "organizer-reported attendance", [ac], "physical-convention-registration"), measurement("ac-2023", "registered_attendees", 13644, "2023-06-29", "organizer-reported attendance", [ac], "physical-convention-registration"), measurement("ac-2024", "registered_attendees", 17639, "2024-07-04", "organizer-reported attendance", [ac], "physical-convention-registration")], evidence: [ac] },
  { id: "midwest-furfest", label: "Midwest FurFest", kind: "convention", geography: "Rosemont, Illinois", measurements: [measurement("mff-2000", "registered_attendees", 388, "2000-12-01", "organizer-reported founding baseline", [mff], "physical-convention-registration")], evidence: [mff] },
  { id: "fur-affinity", label: "Fur Affinity", kind: "platform", measurements: [measurement("fa-members-unknown", "membership", undefined, "2005-01-01", "The source describes the platform but supplies no compatible historical membership series; value preserved as unknown.", [ref("fa-about", "art, music, and stories community", "medium")])], evidence: [ref("fa-about", "art, music, and stories community", "medium")] },
  { id: "furality", label: "Furality / VRChat", kind: "online-community", geography: "Online", measurements: [measurement("va-2020", "registered_attendees", 6153, "2020-06-01", "organizer-reported virtual event attendance", [ref("anthrocon-history", "Virtual Anthrocon attendance", "high")], "virtual-convention-registration"), measurement("luma-2021", "registered_attendees", 6829, "2021-06-04", "organizer-reported virtual event attendance", [fur], "virtual-convention-registration"), measurement("sylva-2023", "registered_attendees", 15160, "2023-06-02", "organizer-reported virtual event attendance", [fur], "virtual-convention-registration"), measurement("umbra-2024", "registered_attendees", 21004, "2024-06-06", "organizer-reported virtual event attendance", [fur], "virtual-convention-registration")], evidence: [fur] },
];

export const people: readonly PersonNode[] = [
  { id: "fred-patten", label: "Fred Patten", role: "historian and editor", evidence: [ref("ucr-patten", "UC Riverside identifies his furry fandom history work", "high")] },
  { id: "steve-gallacci", label: "Steve Gallacci", role: "artist and publisher", evidence: [ref("confurence-2", "ConFurence 2 cast and early event presence", "high")] },
  { id: "mark-merlino", label: "Mark Merlino", role: "early convention organizer", evidence: [ref("confurence-2", "early ConFurence footage context", "medium")] },
  { id: "rod-oriley", label: "Rod O'Riley", role: "early convention organizer", evidence: [ref("confurence-about", "ConFurence archive history", "medium")] },
  { id: "reed-waller", label: "Reed Waller", role: "artist and publisher", evidence: [ref("confurence-2", "ConFurence 2 cast", "high")] },
  { id: "kate-worley", label: "Kate Worley", role: "writer and early convention participant", evidence: [ref("confurence-2", "ConFurence 2 cast", "high")] },
];

export const events: readonly HistoricalEvent[] = [
  { id: "rowrbrazzle-1984", dateStart: "1984-02-01", title: "Rowrbrazzle issue one", summary: "The first issue was distributed to APA members.", entities: ["rowrbrazzle", "fred-patten"], measurements: [measurement("rowr-pages-1993", "page_count", 13730, "1993-10-01", "reported cumulative pages through issue 39", [rowr], "publication-output"), measurement("rowr-frequency", "publication_frequency", 4, "1985-01-01", "quarterly publication frequency", [rowr], "publication-frequency")], evidence: [rowr], confidence: "medium" },
  { id: "confurence-1989", dateStart: "1989-01-01", title: "ConFurence begins", summary: "The archive presents ConFurence as the first annual convention dedicated to the furry community.", entities: ["confurence", "mark-merlino", "rod-oriley"], measurements: [], evidence: [conf], confidence: "medium" },
  { id: "alt-fan-furry-1990", dateStart: "1990-12-18", title: "alt.fan.furry", summary: "A dedicated Usenet group becomes an early online gathering point.", entities: ["alt-fan-furry"], measurements: [], evidence: [ref("fanlore-aff", "group history and archive context", "medium")], confidence: "medium" },
  { id: "furrymuck-1990", dateStart: "1990-11-01", title: "FurryMUCK", summary: "An early persistent online social environment is documented.", entities: ["furrymuck"], measurements: [], evidence: [ref("furrymuck-history", "late-1990 deployment history", "low")], confidence: "low" },
  { id: "confurence-2-1991", dateStart: "1991-01-25", dateEnd: "1991-01-27", title: "ConFurence 2", summary: "An archival video records early organizers, artists, and participants in Anaheim.", entities: ["confurence", "steve-gallacci", "reed-waller", "kate-worley"], measurements: [], evidence: [ref("confurence-2", "event date, location, and cast", "high")], confidence: "high" },
  { id: "rowrbrazzle-1993", dateStart: "1993-10-01", title: "Rowrbrazzle issue 39", summary: "The conbook reports membership and cumulative page output.", entities: ["rowrbrazzle"], measurements: [], evidence: [rowr], confidence: "high" },
  { id: "anthrocon-1997", dateStart: "1997-01-01", title: "Anthrocon begins", summary: "Anthrocon begins as Albany Anthrocon.", entities: ["anthrocon"], measurements: [], evidence: [ac], confidence: "high" },
  { id: "mff-2000", dateStart: "2000-01-01", title: "Midwest FurFest baseline", summary: "The organizer reports 388 attendees in its first year.", entities: ["midwest-furfest"], measurements: [], evidence: [mff], confidence: "high" },
  { id: "fur-affinity-2005", dateStart: "2005-01-01", title: "Fur Affinity founded", summary: "The platform describes itself as a furry art, music, and stories community.", entities: ["fur-affinity"], measurements: [], evidence: [ref("fa-about", "platform description; founding year needs archival corroboration", "medium")], confidence: "medium" },
  { id: "virtual-conventions-2020", dateStart: "2020-06-01", title: "Virtual convention continuity", summary: "Virtual Anthrocon and Furality establish a documented online convention track.", entities: ["anthrocon", "furality"], measurements: [], evidence: [ref("anthrocon-history", "Virtual Anthrocon", "high"), fur], confidence: "high" },
  { id: "furality-2024", dateStart: "2024-06-06", title: "Furality Umbra", summary: "Furality reports 21,004 attendees for its 2024 online event.", entities: ["furality"], measurements: [], evidence: [fur], confidence: "high" },
];

export const edges = [
  ["edge-rowr-publishing", "rowrbrazzle", "fred-patten", 86, "Dedicated APA publication with documented output; index is nonliteral.", [rowr], "medium"],
  ["edge-aff-internet", "alt-fan-furry", "furrymuck", 78, "Early online gathering points documented in archival history; index is nonliteral.", [ref("fanlore-aff", "Usenet archive context", "medium")], "medium"],
  ["edge-confurence-conventions", "confurence", "anthrocon", 82, "ConFurence and Anthrocon are documented convention institutions; index is nonliteral.", [conf, ac], "medium"],
  ["edge-confurence-people", "confurence", "mark-merlino", 72, "Archive identifies early organizer involvement; index is nonliteral.", [ref("confurence-about", "archive history", "medium")], "medium"],
  ["edge-gallacci-publishing", "steve-gallacci", "rowrbrazzle", 75, "Early artist/publisher evidence links people and print culture; index is nonliteral.", [ref("confurence-2", "early cast", "high")], "medium"],
  ["edge-anthro-pittsburgh", "anthrocon", "midwest-furfest", 90, "Both have organizer-reported physical-convention histories; index is nonliteral.", [ac, mff], "high"],
  ["edge-mff-rosemont", "midwest-furfest", "confurence", 80, "Convention archive continuity is qualitative, not an attendance comparison.", [mff, conf], "medium"],
  ["edge-fa-publishing", "fur-affinity", "rowrbrazzle", 88, "Both are documented publishing/art-sharing places from different eras; index is nonliteral.", [ref("fa-about", "art and stories platform", "medium"), rowr], "medium"],
  ["edge-furality-online", "furality", "furrymuck", 84, "Online social spaces across eras; no shared audience metric exists.", [fur, ref("furrymuck-history", "online environment", "low")], "medium"],
  ["edge-furality-vrchat", "furality", "alt-fan-furry", 83, "Virtual convention and Usenet are online places, not comparable populations.", [fur, ref("fanlore-aff", "Usenet group", "medium")], "medium"],
  ["edge-patten-history", "fred-patten", "rowrbrazzle", 91, "University archive documents Patten’s furry history work and editorial context.", [ref("ucr-patten", "historian and collection", "high"), rowr], "high"],
  ["edge-waller-confurence", "reed-waller", "confurence", 78, "ConFurence footage documents early participant presence.", [ref("confurence-2", "cast", "high")], "high"],
].map(([id, from, to, displayIndex, basis, evidence, confidence]) => ({ id: id as string, from: from as string, to: to as string, displayIndex: displayIndex as number, basis: basis as string, metric: "relative_prominence_index" as const, evidence: evidence as readonly EvidenceRef[], confidence: confidence as "high" | "medium" | "low" }));

const point = (year: number, value: number, confidence: "high" | "medium" | "low", sourceIds: readonly string[], note: string, kind: "editorial-anchor" | "editorial-interpolated" = "editorial-anchor") => ({ year, value, confidence, sourceIds, basis: `Editorial nonliteral index: ${note}`, kind });
export const prominenceSeries = [
  { id: "series-rowrbrazzle", label: "Rowrbrazzle", metric: "relative_prominence_index" as const, nonliteral: true as const, pattern: "solid" as const, marker: "circle" as const, points: [point(1994, 82, "high", ["confurence-5"], "print APA membership and output are documented"), point(2000, 62, "medium", ["confurence-5"], "later print prominence is not measured") ] },
  { id: "series-confurence", label: "ConFurence", metric: "relative_prominence_index" as const, nonliteral: true as const, pattern: "dashed" as const, marker: "square" as const, points: [point(1994, 74, "high", ["confurence-5"], "archived convention and publication context"), point(1999, 68, "medium", ["confurence-about"], "archive documents the convention through retirement in 1999") ] },
  { id: "series-anthrocon", label: "Anthrocon", metric: "relative_prominence_index" as const, nonliteral: true as const, pattern: "dotted" as const, marker: "triangle" as const, points: [point(1997, 42, "high", ["anthrocon-history"], "organizer history establishes beginning"), point(2019, 67, "high", ["anthrocon-history"], "organizer attendance record"), point(2024, 91, "high", ["anthrocon-history"], "organizer attendance record") ] },
  { id: "series-midwest-furfest", label: "Midwest FurFest", metric: "relative_prominence_index" as const, nonliteral: true as const, pattern: "dash-dot" as const, marker: "diamond" as const, points: [point(2000, 28, "high", ["mff-about"], "organizer baseline of 388 attendees"), point(2023, 82, "medium", ["con-attendance"], "secondary reported attendance; organizer methodology not attached"), point(2026, 86, "high", ["mff-about"], "organizer describes more than 17,000 attendees") ] },
  { id: "series-furality", label: "Furality", metric: "relative_prominence_index" as const, nonliteral: true as const, pattern: "long-dash" as const, marker: "cross" as const, points: [point(2021, 44, "high", ["furality-history"], "organizer reports Luma attendance"), point(2023, 72, "high", ["furality-history"], "organizer reports Sylva attendance"), point(2024, 94, "high", ["furality-history"], "organizer reports Umbra attendance") ] },
];

export const historyDataset: HistoryDataset = { version: "v1-seed-2026-09-20", sources, events, places, people, edges, prominenceSeries };

