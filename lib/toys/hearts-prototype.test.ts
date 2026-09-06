import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ASSIGNMENT,
  PLAYER_ORDER,
  advanceTrick,
  chooseBotCard,
  createGame,
  createHand,
  getLegalCards,
  playCard,
  scoreTrick,
  winningPlay,
  type PlayedCard,
} from './hearts-prototype';

test('a valid assignment creates twelve cards with three of every suit', () => {
  const hand = createHand('south', DEFAULT_ASSIGNMENT);
  assert.equal(hand.length, 12);
  for (const suit of ['hearts', 'spades', 'diamonds', 'clubs'] as const) {
    assert.equal(hand.filter((card) => card.suit === suit).length, 3);
  }
});

test('players must follow suit when possible', () => {
  const hand = createHand('south', DEFAULT_ASSIGNMENT);
  const lead = {
    ...hand.find((card) => card.suit === 'diamonds')!,
    playedBy: 'west' as const,
  };
  const legal = getLegalCards(hand, [lead], false);
  assert.equal(legal.length, 3);
  assert.ok(legal.every((card) => card.suit === 'diamonds'));
});

test('hearts cannot be led before they are broken unless only hearts remain', () => {
  const hand = createHand('south', DEFAULT_ASSIGNMENT);
  assert.ok(getLegalCards(hand, [], false).every((card) => card.suit !== 'hearts'));
  const hearts = hand.filter((card) => card.suit === 'hearts');
  assert.deepEqual(getLegalCards(hearts, [], false), hearts);
});

test('every queen of spades in a trick scores thirteen points', () => {
  const queens: PlayedCard[] = ['south', 'west'].map((player) => ({
    id: `${player}-queen`,
    owner: player as 'south' | 'west',
    playedBy: player as 'south' | 'west',
    rank: 12,
    suit: 'spades',
  }));
  assert.equal(scoreTrick(queens), 26);
});

test('the first-played card wins a duplicate-rank tie', () => {
  const trick: PlayedCard[] = [
    { id: 'first', owner: 'west', playedBy: 'west', rank: 12, suit: 'spades' },
    { id: 'second', owner: 'north', playedBy: 'north', rank: 12, suit: 'spades' },
  ];
  assert.equal(winningPlay(trick).playedBy, 'west');
});

test('four automated players can complete a twelve-trick round', () => {
  let game = createGame(DEFAULT_ASSIGNMENT);
  let safety = 0;

  while (game.phase !== 'round-complete' && safety < 100) {
    if (game.phase === 'trick-complete') {
      game = advanceTrick(game);
    } else {
      const player = game.currentPlayer;
      const card = chooseBotCard(game, player);
      game = playCard(game, player, card.id);
    }
    safety += 1;
  }

  assert.equal(game.phase, 'round-complete');
  assert.equal(game.trickNumber, 12);
  assert.ok(PLAYER_ORDER.every((player) => game.hands[player].length === 0));
});
