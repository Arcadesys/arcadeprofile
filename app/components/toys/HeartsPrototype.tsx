'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_ASSIGNMENT,
  PLAYER_LABELS,
  PLAYER_ORDER,
  RANK_BANDS,
  SUIT_LABELS,
  SUIT_SYMBOLS,
  SUITS,
  advanceTrick,
  cardName,
  chooseBotCard,
  createGame,
  getLegalCards,
  playCard,
  rankLabel,
  type Card,
  type HandAssignment,
  type HeartsGame,
  type PlayedCard,
  type PlayerId,
  type RankBandId,
  type Suit,
} from '@/lib/toys/hearts-prototype';

import styles from './HeartsPrototype.module.css';

const SUIT_ORDER: Record<Suit, number> = {
  hearts: 0,
  spades: 1,
  diamonds: 2,
  clubs: 3,
};

function CardFace({
  card,
  disabled = false,
  onPlay,
}: {
  card: Card | PlayedCard;
  disabled?: boolean;
  onPlay?: () => void;
}) {
  const contents = (
    <>
      <span className={styles.cardRank}>{rankLabel(card.rank)}</span>
      <span aria-hidden="true" className={styles.cardSuit}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span className={styles.cardSuitName}>{SUIT_LABELS[card.suit]}</span>
    </>
  );

  if (onPlay) {
    return (
      <button
        aria-label={`Play ${cardName(card)}`}
        className={styles.card}
        data-red={card.suit === 'hearts' || card.suit === 'diamonds'}
        disabled={disabled}
        onClick={onPlay}
        type="button"
      >
        {contents}
      </button>
    );
  }

  return (
    <div
      aria-label={cardName(card)}
      className={styles.card}
      data-red={card.suit === 'hearts' || card.suit === 'diamonds'}
      role="img"
    >
      {contents}
    </div>
  );
}

function Setup({
  assignment,
  onChange,
  onStart,
}: {
  assignment: HandAssignment;
  onChange: (band: RankBandId, suit: Suit) => void;
  onStart: () => void;
}) {
  return (
    <section aria-labelledby="build-heading" className={styles.setupPanel}>
      <div className={styles.setupIntro}>
        <p className={styles.eyebrow}>Build your twelve-card hand</p>
        <h2 id="build-heading">Give each rank block a suit.</h2>
        <p>
          You always receive three cards from every suit. Your choice is where
          the high cards and low cards go.
        </p>
      </div>

      <div className={styles.assignmentGrid}>
        {RANK_BANDS.map((band) => (
          <label className={styles.assignment} key={band.id}>
            <strong>{band.label}</strong>
            <span>Choose this block&rsquo;s suit</span>
            <select
              aria-label={`Suit for ${band.label}`}
              onChange={(event) =>
                onChange(band.id, event.target.value as Suit)
              }
              value={assignment[band.id]}
            >
              {SUITS.map((suit) => (
                <option key={suit} value={suit}>
                  {SUIT_SYMBOLS[suit]} {SUIT_LABELS[suit]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className={styles.setupFooter}>
        <p>
          Selecting a suit already in use swaps the two blocks. No duplicates,
          no invalid setup.
        </p>
        <button className={styles.primaryButton} onClick={onStart} type="button">
          Play Wall One
        </button>
      </div>
    </section>
  );
}

function PlayerStatus({ game, player }: { game: HeartsGame; player: PlayerId }) {
  const active = game.phase === 'playing' && game.currentPlayer === player;
  return (
    <div className={styles.playerStatus} data-active={active}>
      <strong>{PLAYER_LABELS[player]}</strong>
      <span>{game.hands[player].length} cards</span>
      <span>{game.scores[player]} pain</span>
    </div>
  );
}

function PlayedSlot({ game, player }: { game: HeartsGame; player: PlayerId }) {
  const play = game.trick.find((card) => card.playedBy === player);
  return (
    <div
      aria-label={`${PLAYER_LABELS[player]} played ${play ? cardName(play) : 'nothing yet'}`}
      className={styles.playedSlot}
      data-player={player}
    >
      <span className={styles.slotLabel}>{PLAYER_LABELS[player]}</span>
      {play ? <CardFace card={play} /> : <span className={styles.emptySlot}>—</span>}
    </div>
  );
}

function statusText(game: HeartsGame): string {
  if (game.phase === 'round-complete') return 'The wall is complete.';
  if (game.phase === 'trick-complete' && game.lastWinner) {
    return `${PLAYER_LABELS[game.lastWinner]} took ${game.lastTrickPoints} pain.`;
  }
  if (game.currentPlayer === 'south') {
    return game.trick.length === 0 ? 'Your lead.' : 'Your turn. Follow suit if you can.';
  }
  return `${PLAYER_LABELS[game.currentPlayer]} is choosing a card.`;
}

function RoundResults({
  assignment,
  game,
  onRebuild,
  onReplay,
}: {
  assignment: HandAssignment;
  game: HeartsGame;
  onRebuild: () => void;
  onReplay: (assignment: HandAssignment) => void;
}) {
  const ranking = [...PLAYER_ORDER].sort(
    (a, b) => game.scores[a] - game.scores[b],
  );
  const bestScore = game.scores[ranking[0]];
  const winners = ranking.filter((player) => game.scores[player] === bestScore);

  return (
    <section aria-labelledby="results-heading" className={styles.results}>
      <p className={styles.eyebrow}>Wall One complete</p>
      <h2 id="results-heading">
        {winners.includes('south') ? 'You survived the cleanest.' : `${PLAYER_LABELS[ranking[0]]} wins.`}
      </h2>
      <ol>
        {ranking.map((player) => (
          <li key={player}>
            <strong>{PLAYER_LABELS[player]}</strong>
            <span>{game.scores[player]} pain</span>
          </li>
        ))}
      </ol>
      <div className={styles.resultActions}>
        <button
          className={styles.primaryButton}
          onClick={() => onReplay(assignment)}
          type="button"
        >
          Replay this hand
        </button>
        <button className={styles.secondaryButton} onClick={onRebuild} type="button">
          Rebuild your hand
        </button>
      </div>
    </section>
  );
}

export default function HeartsPrototype() {
  const [assignment, setAssignment] =
    useState<HandAssignment>(DEFAULT_ASSIGNMENT);
  const [game, setGame] = useState<HeartsGame | null>(null);

  const changeAssignment = (band: RankBandId, suit: Suit) => {
    setAssignment((current) => {
      const previousSuit = current[band];
      const occupiedBand = RANK_BANDS.find(
        ({ id }) => id !== band && current[id] === suit,
      )?.id;
      if (!occupiedBand) return { ...current, [band]: suit };
      return {
        ...current,
        [band]: suit,
        [occupiedBand]: previousSuit,
      };
    });
  };

  useEffect(() => {
    if (!game) return;

    if (game.phase === 'trick-complete') {
      const timer = window.setTimeout(() => {
        setGame((current) => (current ? advanceTrick(current) : current));
      }, 900);
      return () => window.clearTimeout(timer);
    }

    if (game.phase === 'playing' && game.currentPlayer !== 'south') {
      const timer = window.setTimeout(() => {
        setGame((current) => {
          if (!current || current.phase !== 'playing') return current;
          const player = current.currentPlayer;
          const card = chooseBotCard(current, player);
          return playCard(current, player, card.id);
        });
      }, 520);
      return () => window.clearTimeout(timer);
    }
  }, [game]);

  const sortedHand = useMemo(() => {
    if (!game) return [];
    return [...game.hands.south].sort(
      (a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank,
    );
  }, [game]);

  const legalIds = useMemo(() => {
    if (!game || game.phase !== 'playing' || game.currentPlayer !== 'south') {
      return new Set<string>();
    }
    return new Set(
      getLegalCards(game.hands.south, game.trick, game.heartsBroken).map(
        ({ id }) => id,
      ),
    );
  }, [game]);

  const playUserCard = (cardId: string) => {
    setGame((current) =>
      current ? playCard(current, 'south', cardId) : current,
    );
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Playable rules prototype</p>
        <h1>Hearts: Wall One</h1>
        <p>
          Build a strange starting hand. Play twelve tricks. Lowest pain wins.
        </p>
      </header>

      {!game ? (
        <Setup
          assignment={assignment}
          onChange={changeAssignment}
          onStart={() => setGame(createGame(assignment))}
        />
      ) : (
        <>
          <section aria-label="Round status" className={styles.scoreboard}>
            <div>
              <span>Wall</span>
              <strong>1</strong>
            </div>
            <div>
              <span>Trick</span>
              <strong>{game.trickNumber} / 12</strong>
            </div>
            <div>
              <span>Hearts</span>
              <strong>{game.heartsBroken ? 'Broken' : 'Sealed'}</strong>
            </div>
          </section>

          <section aria-label="Card table" className={styles.table}>
            <div className={styles.opponents}>
              {(['west', 'north', 'east'] as const).map((player) => (
                <PlayerStatus game={game} key={player} player={player} />
              ))}
            </div>

            <div className={styles.trickGrid}>
              {PLAYER_ORDER.map((player) => (
                <PlayedSlot game={game} key={player} player={player} />
              ))}
              <div aria-live="polite" className={styles.turnStatus}>
                <span>Trick {game.trickNumber}</span>
                <strong>{statusText(game)}</strong>
              </div>
            </div>

            {game.phase === 'round-complete' ? (
              <RoundResults
                assignment={assignment}
                game={game}
                onRebuild={() => setGame(null)}
                onReplay={(nextAssignment) => setGame(createGame(nextAssignment))}
              />
            ) : (
              <section aria-labelledby="your-hand-heading" className={styles.handArea}>
                <div className={styles.handHeading}>
                  <div>
                    <span>South</span>
                    <h2 id="your-hand-heading">Your hand</h2>
                  </div>
                  <strong>{game.scores.south} pain</strong>
                </div>
                <div className={styles.hand}>
                  {sortedHand.map((card) => (
                    <CardFace
                      card={card}
                      disabled={!legalIds.has(card.id)}
                      key={card.id}
                      onPlay={() => playUserCard(card.id)}
                    />
                  ))}
                </div>
                <p className={styles.legalHint}>
                  Available cards have a bright border. Unavailable cards are dimmed.
                </p>
              </section>
            )}
          </section>
        </>
      )}

      <details className={styles.rules}>
        <summary>Prototype rules</summary>
        <div>
          <p>
            Each player assigns A–K–Q, J–10–9, 8–7–6, and 5–4–3 to the four
            suits. This creates twelve cards: three per suit.
          </p>
          <ul>
            <li>Follow the led suit when you can.</li>
            <li>Hearts cannot lead until someone discards one.</li>
            <li>Each Heart is 1 pain. Every Queen of Spades is 13 pain.</li>
            <li>Duplicate cards are allowed. The first duplicate played wins a tie.</li>
            <li>Passing and shoot-the-moon scoring are not in this first prototype.</li>
          </ul>
        </div>
      </details>
    </main>
  );
}
