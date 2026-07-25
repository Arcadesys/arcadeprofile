import reactionsJson from '@/data/toys/interspecies-dating-is-hard-reactions.json';
import type { TwineVariables } from '@/lib/toys/twine-engine';

export type GertrudeReactionId =
  | 'neutral'
  | 'determined'
  | 'delighted'
  | 'skeptical'
  | 'worried'
  | 'tender';

export type GertrudeReaction = {
  id: GertrudeReactionId;
  label: string;
  blobUrl: string;
  alt: string;
  width: number;
  height: number;
};

export const GERTRUDE_REACTIONS =
  reactionsJson.reactions as GertrudeReaction[];

const reactionById = new Map(
  GERTRUDE_REACTIONS.map((reaction) => [reaction.id, reaction]),
);

const determinedPassages = new Set([
  'Start',
  'Home',
  'List',
  'Start Date',
  'Meet at Quorum Park',
  'Where to?',
  'Misteak Menu',
]);

const delightedPassages = new Set([
  'Buy QWC Tix',
  'Buy Lakeside Tix',
  'Buy Misteak Tix',
  'Buy Chez Tix',
  'Buy JANM Tix',
  'JANM',
  'JANM Warmup',
  'Lakeside Ink',
  'Chez Toon',
  "Benny's Burrow",
  "Marie's Thrift Shop",
  'Library Tess',
  'Meet at Quorum Library',
  'Park Tess',
]);

const skepticalPassages = new Set([
  'Backstory2',
  'Gas Tess',
  'Lakeside Tess',
  'Chez Tess',
  'Misteak Tess',
  'QWC Tess',
  'Mall Tess',
  'Benny Chances',
  'Quorum High School',
]);

const worriedPassages = new Set([
  'Meet at Quorum Mall',
  'Misteak Date',
  'Lakeside Date',
  'QWC Date',
  'Quorum Park Date',
]);

function requireReaction(id: GertrudeReactionId): GertrudeReaction {
  const reaction = reactionById.get(id);
  if (!reaction) {
    throw new Error(`Missing Gertrude reaction asset: ${id}`);
  }
  return reaction;
}

export function getGertrudeReaction(
  passageId: string,
  variables: TwineVariables,
): GertrudeReaction {
  if (passageId === 'Victory') return requireReaction('tender');

  if (passageId === 'JANM Date') {
    return requireReaction(
      variables.Painted === true ? 'tender' : 'worried',
    );
  }

  if (passageId === 'Chez Date') {
    return requireReaction(
      variables.CoolWithAMakeover === true ? 'delighted' : 'worried',
    );
  }

  if (worriedPassages.has(passageId)) return requireReaction('worried');
  if (skepticalPassages.has(passageId)) return requireReaction('skeptical');
  if (delightedPassages.has(passageId)) return requireReaction('delighted');
  if (determinedPassages.has(passageId)) return requireReaction('determined');

  return requireReaction('neutral');
}
