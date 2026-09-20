export const LENS_LABELS = ["Overview", "Internet", "Publishing", "Conventions", "People"] as const;
export type LensLabel = (typeof LENS_LABELS)[number];

