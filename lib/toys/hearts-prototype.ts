export const SUITS = ['hearts', 'spades', 'diamonds', 'clubs'] as const;

export type Suit = (typeof SUITS)[number];

export const SUIT_LABELS: Record<Suit, string> = {
  hearts: 'Hearts',
  spades: 'Spades',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  spades: '♠',
  diamonds: '♦',
  clubs: '♣',
};

export const RANK_BANDS = [
  { id: 'high', label: 'A K Q', ranks: [14, 13, 12] },
  { id: 'upper', label: 'J 10 9', ranks: [11, 10, 9] },
  { id: 'middle', label: '8 7 6', ranks: [8, 7, 6] },
  { id: 'low', label: '5 4 3', ranks: [5, 4, 3] },
] as const;

export type RankBandId = (typeof RANK_BANDS)[number]['id'];
export type HandAssignment = Record<RankBandId, Suit>;

export const DEFAULT_ASSIGNMENT: HandAssignment = {
  high: 'hearts',
  upper: 'spades',
  middle: 'diamonds',
  low: 'clubs',
};

export const PLAYER_ORDER = ['south', 'west', 'north', 'east'] as const;
export type PlayerId = (typeof PLAYER_ORDER)[number];

export const PLAYER_LABELS: Record<PlayerId, string> = {
  south: 'You',
  west: 'West',
  north: 'North',
  east: 'East',
};

export type Card = {
  id: string;
  owner: PlayerId;
  rank: number;
  suit: Suit;
};

export type PlayedCard = Card & { playedBy: PlayerId };

export type GamePhase = 'playing' | 'trick-complete' | 'round-complete';

export type HeartsGame = {
  phase: GamePhase;
  trickNumber: number;
  leader: PlayerId;
  currentPlayer: PlayerId;
  hands: Record<PlayerId, Card[]>;
  trick: PlayedCard[];
  scores: Record<PlayerId, number>;
  heartsBroken: boolean;
  lastWinner: PlayerId | null;
  lastTrickPoints: number;
};

const BOT_ASSIGNMENTS: Record<Exclude<PlayerId, 'south'>, HandAssignment> = {
  west: {
    high: 'diamonds',
    upper: 'hearts',
    middle: 'spades',
    low: 'clubs',
  },
  north: {
    high: 'spades',
    upper: 'clubs',
    middle: 'diamonds',
    low: 'hearts',
  },
  east: {
    high: 'hearts',
    upper: 'spades',
    middle: 'clubs',
    low: 'diamonds',
  },
};

export function isValidAssignment(assignment: HandAssignment): boolean {
  return new Set(Object.values(assignment)).size === SUITS.length;
}

export function createHand(
  owner: PlayerId,
  assignment: HandAssignment,
): Card[] {
  if (!isValidAssignment(assignment)) {
    throw new Error('Each rank block must be assigned to a different suit.');
  }

  return RANK_BANDS.flatMap(({ id, ranks }) =>
    ranks.map((rank) => ({
      id: `${owner}-${id}-${rank}`,
      owner,
      rank,
      suit: assignment[id],
    })),
  );
}

export function createGame(userAssignment: HandAssignment): HeartsGame {
  return {
    phase: 'playing',
    trickNumber: 1,
    leader: 'south',
    currentPlayer: 'south',
    hands: {
      south: createHand('south', userAssignment),
      west: createHand('west', BOT_ASSIGNMENTS.west),
      north: createHand('north', BOT_ASSIGNMENTS.north),
      east: createHand('east', BOT_ASSIGNMENTS.east),
    },
    trick: [],
    scores: { south: 0, west: 0, north: 0, east: 0 },
    heartsBroken: false,
    lastWinner: null,
    lastTrickPoints: 0,
  };
}

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function cardName(card: Pick<Card, 'rank' | 'suit'>): string {
  const names: Record<number, string> = {
    14: 'Ace',
    13: 'King',
    12: 'Queen',
    11: 'Jack',
  };
  return `${names[card.rank] ?? card.rank} of ${SUIT_LABELS[card.suit]}`;
}

export function getLegalCards(
  hand: readonly Card[],
  trick: readonly PlayedCard[],
  heartsBroken: boolean,
): Card[] {
  if (trick.length > 0) {
    const leadSuit = trick[0].suit;
    const following = hand.filter((card) => card.suit === leadSuit);
    return following.length > 0 ? following : [...hand];
  }

  if (heartsBroken) return [...hand];

  const nonHearts = hand.filter((card) => card.suit !== 'hearts');
  return nonHearts.length > 0 ? nonHearts : [...hand];
}

export function scoreCard(card: Pick<Card, 'rank' | 'suit'>): number {
  if (card.suit === 'hearts') return 1;
  if (card.suit === 'spades' && card.rank === 12) return 13;
  return 0;
}

export function scoreTrick(trick: readonly PlayedCard[]): number {
  return trick.reduce((total, card) => total + scoreCard(card), 0);
}

export function winningPlay(trick: readonly PlayedCard[]): PlayedCard {
  if (trick.length === 0) throw new Error('An empty trick has no winner.');
  const leadSuit = trick[0].suit;
  return trick.reduce((winner, card) => {
    if (card.suit === leadSuit && card.rank > winner.rank) return card;
    return winner;
  }, trick[0]);
}

function nextPlayer(player: PlayerId): PlayerId {
  const index = PLAYER_ORDER.indexOf(player);
  return PLAYER_ORDER[(index + 1) % PLAYER_ORDER.length];
}

export function playCard(
  game: HeartsGame,
  player: PlayerId,
  cardId: string,
): HeartsGame {
  if (game.phase !== 'playing' || game.currentPlayer !== player) {
    throw new Error('It is not that player\'s turn.');
  }

  const hand = game.hands[player];
  const card = hand.find(({ id }) => id === cardId);
  if (!card) throw new Error('That card is not in the player\'s hand.');

  const legalIds = new Set(
    getLegalCards(hand, game.trick, game.heartsBroken).map(({ id }) => id),
  );
  if (!legalIds.has(cardId)) throw new Error('That card cannot be played now.');

  const hands = {
    ...game.hands,
    [player]: hand.filter(({ id }) => id !== cardId),
  };
  const trick = [...game.trick, { ...card, playedBy: player }];
  const heartsBroken = game.heartsBroken || card.suit === 'hearts';

  if (trick.length < PLAYER_ORDER.length) {
    return {
      ...game,
      hands,
      trick,
      heartsBroken,
      currentPlayer: nextPlayer(player),
    };
  }

  const winner = winningPlay(trick).playedBy;
  const points = scoreTrick(trick);
  const scores = {
    ...game.scores,
    [winner]: game.scores[winner] + points,
  };
  const roundComplete = PLAYER_ORDER.every(
    (playerId) => hands[playerId].length === 0,
  );

  return {
    ...game,
    phase: roundComplete ? 'round-complete' : 'trick-complete',
    hands,
    trick,
    scores,
    heartsBroken,
    leader: winner,
    currentPlayer: winner,
    lastWinner: winner,
    lastTrickPoints: points,
  };
}

export function advanceTrick(game: HeartsGame): HeartsGame {
  if (game.phase !== 'trick-complete') return game;
  return {
    ...game,
    phase: 'playing',
    trickNumber: game.trickNumber + 1,
    trick: [],
    lastWinner: null,
    lastTrickPoints: 0,
  };
}

export function chooseBotCard(game: HeartsGame, player: PlayerId): Card {
  const legal = getLegalCards(
    game.hands[player],
    game.trick,
    game.heartsBroken,
  );
  if (legal.length === 0) throw new Error('The bot has no legal card.');

  const byRank = [...legal].sort((a, b) => a.rank - b.rank);
  if (game.trick.length === 0) return byRank[0];

  const leadSuit = game.trick[0].suit;
  const followsSuit = byRank.every((card) => card.suit === leadSuit);
  if (followsSuit) {
    const currentWinner = winningPlay(game.trick);
    const duckingCards = byRank.filter((card) => card.rank <= currentWinner.rank);
    return duckingCards.at(-1) ?? byRank[0];
  }

  const queen = byRank.find(
    (card) => card.suit === 'spades' && card.rank === 12,
  );
  if (queen) return queen;
  const heart = byRank.filter((card) => card.suit === 'hearts').at(-1);
  return heart ?? byRank.at(-1)!;
}
