export type ISODate = `${number}-${number}-${number}`;
export type MetricKind = "attendance" | "registered_attendees" | "membership" | "page_count" | "publication_frequency" | "relative_prominence_index";
export type Confidence = "high" | "medium" | "low";
export type EvidenceType = "primary" | "archival-secondary" | "tertiary" | "inference";
export type PlaceKind = "platform" | "website" | "convention" | "city" | "region" | "online-community";

export interface Source { readonly id: string; readonly title: string; readonly url: string; readonly accessedAt: ISODate; readonly evidenceType: EvidenceType; readonly locator?: string; }
export interface EvidenceRef { readonly sourceId: string; readonly supports: string; readonly confidence: Confidence; readonly notes?: string; }
export interface Measurement { readonly id: string; readonly metric: MetricKind; readonly value?: number; readonly unit?: string; readonly periodStart: ISODate; readonly periodEnd: ISODate; readonly methodology: string; readonly comparableGroup?: string; readonly evidence: readonly EvidenceRef[]; }
export interface HistoricalEvent { readonly id: string; readonly dateStart: ISODate; readonly dateEnd?: ISODate; readonly title: string; readonly summary: string; readonly entities: readonly string[]; readonly measurements: readonly Measurement[]; readonly evidence: readonly EvidenceRef[]; readonly confidence: Confidence; }
export interface PlaceNode { readonly id: string; readonly label: string; readonly kind: PlaceKind; readonly geography?: string; readonly measurements: readonly Measurement[]; readonly evidence: readonly EvidenceRef[]; }
export interface PersonNode { readonly id: string; readonly label: string; readonly role: string; readonly evidence: readonly EvidenceRef[]; }
export interface ProminenceEdge { readonly id: string; readonly from: string; readonly to: string; readonly displayIndex?: number; readonly basis: string; readonly metric: "relative_prominence_index"; readonly evidence: readonly EvidenceRef[]; readonly confidence: Confidence; }
export interface ProminencePoint { readonly year: number; readonly value: number; readonly confidence: Confidence; readonly sourceIds: readonly string[]; readonly basis: string; readonly kind: "editorial-anchor" | "editorial-interpolated"; }
export interface ProminenceSeries { readonly id: string; readonly label: string; readonly points: readonly ProminencePoint[]; readonly metric: "relative_prominence_index"; readonly nonliteral: true; readonly pattern: "solid" | "dashed" | "dotted" | "dash-dot" | "long-dash"; readonly marker: "circle" | "square" | "triangle" | "diamond" | "cross"; }
export interface HistoryDataset { readonly version: string; readonly sources: readonly Source[]; readonly events: readonly HistoricalEvent[]; readonly places: readonly PlaceNode[]; readonly people: readonly PersonNode[]; readonly edges: readonly ProminenceEdge[]; readonly prominenceSeries: readonly ProminenceSeries[]; }

