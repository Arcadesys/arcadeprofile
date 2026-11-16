import { ESSAYS_NAV_ITEM, ORIENTATION_NAV_ITEMS, STORIES_NAV_ITEM } from './nav-items';

export type BreadcrumbItem = {
  label: string;
  /** Omitted on the current page, which renders as plain text. */
  href?: string;
};

export type BreadcrumbLink = { title: string; href: string };

const READ_NAV_ITEM = ORIENTATION_NAV_ITEMS.find((item) => item.id === 'writing');
if (!READ_NAV_ITEM) throw new Error('ORIENTATION_NAV_ITEMS must contain the Read destination');

/** The rail's own word for the Read hub, so the trail cannot drift from it. */
export const READ_BREADCRUMB_ITEM: BreadcrumbItem = {
  label: READ_NAV_ITEM.label,
  href: READ_NAV_ITEM.href,
};

/**
 * Fiction lives at /stories. The label is "Fiction" to match the Read hub's
 * door title, but the rail still calls the route "Stories". NAMING DECISION
 * PENDING: change this one constant (or STORIES_NAV_ITEM) once the site picks
 * one name; nothing else in the trail builders hard-codes it.
 */
export const FICTION_BREADCRUMB_ITEM: BreadcrumbItem = {
  label: 'Fiction',
  href: STORIES_NAV_ITEM.href,
};

const ESSAYS_BREADCRUMB_ITEM: BreadcrumbItem = {
  label: ESSAYS_NAV_ITEM.label,
  href: ESSAYS_NAV_ITEM.href,
};

const SECTION_ITEMS = {
  essays: ESSAYS_BREADCRUMB_ITEM,
  fiction: FICTION_BREADCRUMB_ITEM,
} as const;

export type PieceSection = keyof typeof SECTION_ITEMS;

function link(label: string, href: string): BreadcrumbItem {
  return { label, href };
}

/** Read > Essays|Fiction > series (when the piece belongs to one) > piece. */
export function buildPieceTrail(input: {
  section: PieceSection;
  series?: BreadcrumbLink;
  pieceTitle: string;
}): BreadcrumbItem[] {
  const { section, series, pieceTitle } = input;
  return [
    { ...READ_BREADCRUMB_ITEM },
    { ...SECTION_ITEMS[section] },
    ...(series ? [link(series.title, series.href)] : []),
    { label: pieceTitle },
  ];
}

/** Read > Fiction > collection > piece, for novels and collections that sit under Fiction. */
export function buildCollectionPieceTrail(input: {
  collection: BreadcrumbLink;
  pieceTitle: string;
}): BreadcrumbItem[] {
  return [
    { ...READ_BREADCRUMB_ITEM },
    { ...FICTION_BREADCRUMB_ITEM },
    link(input.collection.title, input.collection.href),
    { label: input.pieceTitle },
  ];
}
