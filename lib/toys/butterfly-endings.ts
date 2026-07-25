export type ButterflyEnding = {
  /** Passage id — every ending is a passage with no outgoing links. */
  id: string;
  title: string;
};

export const BUTTERFLY_ENDINGS = [
  { id: 'Good Night', title: 'Good Night' },
  { id: 'Port In', title: 'Port In' },
  { id: 'Angry Port In', title: 'Blocked' },
] as const satisfies readonly ButterflyEnding[];

export function getButterflyEnding(
  passageId: string,
): ButterflyEnding | undefined {
  return BUTTERFLY_ENDINGS.find(({ id }) => id === passageId);
}
