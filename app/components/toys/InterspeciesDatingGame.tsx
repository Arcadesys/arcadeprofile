'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import storyJson from '@/data/toys/interspecies-dating-is-hard.json';
import { TOY_CATALOG } from '@/data/toys/catalog';
import {
  enterPassage,
  type PreparedPassage,
  type RawTwineStory,
  type TwineVariables,
} from '@/lib/toys/twine-engine';
import {
  getInterspeciesDatingLocation,
  type InterspeciesDatingLocation,
} from '@/lib/toys/interspecies-dating-locations';
import {
  getGertrudeReaction,
  type GertrudeReaction,
} from '@/lib/toys/interspecies-dating-reactions';
import { trackToyEvent } from '@/lib/toys/toy-analytics';
import {
  readToyPassport,
  saveToyProgress,
} from '@/lib/toys/toy-passport';
import styles from './InterspeciesDatingGame.module.css';
import ToyEndingPanel from './ToyEndingPanel';

const story = storyJson as RawTwineStory;
const outcomeCount =
  TOY_CATALOG.find(({ id }) => id === story.slug)?.outcomeCount ?? 1;
const endingTitles: Readonly<Record<string, string>> = {
  'Meet at Quorum Mall': 'Standing alone at Quorum Mall',
  'Quorum Park Date': 'A walk in Quorum Park',
  'Lakeside Date': 'Lakeside Ink',
  'QWC Date': 'A night at the movies',
  'Misteak Date': 'Dinner at Misteak',
  'JANM Date': 'Robot battle night',
  Victory: 'The perfect date',
};

type GameSnapshot = {
  passage: PreparedPassage;
  variables: TwineVariables;
  entryVariables: TwineVariables;
};

type GameState = GameSnapshot & {
  history: GameSnapshot[];
  seenEndings: string[];
  visited: string[];
};

const PLAN_FLAGS = [
  ['ChezDate', 'Makeover appointment'],
  ['JANMDate', 'Robot battle tickets'],
  ['LakesideDate', 'Waterskiing lessons'],
  ['MisteakDate', 'Misteak reservation'],
  ['QWCDate', 'Movie tickets'],
] as const;

function createInitialGame(seenEndings: string[] = []): GameState {
  const entered = enterPassage(story, story.start, {});
  return {
    ...entered,
    entryVariables: {},
    history: [],
    seenEndings,
    visited: [story.start],
  };
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.chevron}
      viewBox="0 0 24 24"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function renderInlineFormatting(text: string): ReactNode {
  const pieces = text.split(/(_[^_\n]+_)/g);

  return pieces.map((piece, index) => {
    if (piece.startsWith('_') && piece.endsWith('_')) {
      return <em key={`${piece}-${index}`}>{piece.slice(1, -1)}</em>;
    }
    return <Fragment key={`${piece}-${index}`}>{piece}</Fragment>;
  });
}

function PassageText({ body }: { body: string }) {
  const paragraphs = useMemo(
    () =>
      body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean),
    [body],
  );

  return (
    <div className={styles.prose}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 32)}-${index}`}>
          {renderInlineFormatting(paragraph)}
        </p>
      ))}
    </div>
  );
}

function PassageArtwork({
  location,
  reaction,
}: {
  location: InterspeciesDatingLocation;
  reaction: GertrudeReaction;
}) {
  const worldLabel = location.world === 'real' ? 'Real world' : 'Toon world';

  return (
    <figure className={styles.locationArtwork} data-world={location.world}>
      <div className={styles.sceneFrame}>
        <Image
          alt={location.alt}
          className={styles.locationImage}
          height={1024}
          priority
          sizes="(max-width: 900px) calc(100vw - 2rem), 840px"
          src={location.blobUrl}
          width={1536}
        />
        <Image
          alt={reaction.alt}
          className={styles.characterLayer}
          height={reaction.height}
          priority={reaction.id === 'neutral'}
          sizes="(max-width: 620px) 48vw, (max-width: 900px) 40vw, 360px"
          src={reaction.blobUrl}
          width={reaction.width}
        />
        <span className={styles.reactionBadge}>
          Trudy: {reaction.label}
        </span>
      </div>
      <figcaption>
        <strong>{location.title}</strong>
        <span className={styles.worldLabel}>{worldLabel}</span>
      </figcaption>
    </figure>
  );
}

export default function InterspeciesDatingGame() {
  const [game, setGame] = useState<GameState>(createInitialGame);
  const [passportReady, setPassportReady] = useState(false);
  const passageHeadingRef = useRef<HTMLHeadingElement>(null);
  const hydratedRef = useRef(false);
  const trackedEndingsRef = useRef(new Set<string>());
  const ending =
    game.passage.choices.length === 0 ? game.passage.id : undefined;

  useEffect(() => {
    passageHeadingRef.current?.focus();
  }, [game.passage.id]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const saved = readToyPassport().games[story.slug];
    const canResume =
      saved &&
      story.passages.some(({ id }) => id === saved.currentPassageId);

    if (canResume) {
      const entered = enterPassage(
        story,
        saved.currentPassageId,
        saved.entryVariables,
      );
      trackedEndingsRef.current = new Set(saved.endingIds);
      setGame({
        ...entered,
        entryVariables: saved.entryVariables,
        history: [],
        seenEndings: saved.endingIds,
        visited: saved.visitedPassageIds,
      });
    }

    trackToyEvent('toy_started', story.slug, { resumed: Boolean(canResume) });
    setPassportReady(true);
  }, []);

  useEffect(() => {
    if (!ending) return;

    setGame((current) => {
      if (current.seenEndings.includes(ending)) return current;

      if (!trackedEndingsRef.current.has(ending)) {
        trackedEndingsRef.current.add(ending);
        trackToyEvent('toy_completed', story.slug, {
          ending,
          visited: current.visited.length,
        });
      }

      return { ...current, seenEndings: [...current.seenEndings, ending] };
    });
  }, [ending]);

  useEffect(() => {
    if (!passportReady) return;

    saveToyProgress(story.slug, {
      currentPassageId: game.passage.id,
      entryVariables: game.entryVariables,
      visitedPassageIds: game.visited,
      endingIds: game.seenEndings,
      atEnding: Boolean(ending),
      updatedAt: new Date().toISOString(),
    });
  }, [
    ending,
    game.entryVariables,
    game.passage.id,
    game.seenEndings,
    game.visited,
    passportReady,
  ]);

  const purchasedPlans = PLAN_FLAGS.filter(
    ([flag]) => game.variables[flag] === true,
  );
  const dollars =
    typeof game.variables.Dollars === 'number' ? game.variables.Dollars : 75;
  const location = getInterspeciesDatingLocation(game.passage.id);
  const reaction = getGertrudeReaction(
    game.passage.id,
    game.variables,
  );

  function choose(target: string) {
    setGame((current) => {
      const entryVariables = current.variables;
      const next = enterPassage(story, target, entryVariables);

      if (current.visited.length === 1) {
        trackToyEvent('first_choice_made', story.slug, { target });
      }

      return {
        ...current,
        ...next,
        entryVariables,
        history: [
          ...current.history,
          {
            passage: current.passage,
            variables: current.variables,
            entryVariables: current.entryVariables,
          },
        ],
        visited: current.visited.includes(target)
          ? current.visited
          : [...current.visited, target],
      };
    });
  }

  function rewind() {
    setGame((current) => {
      const previous = current.history.at(-1);
      if (!previous) return current;

      return {
        ...current,
        ...previous,
        history: current.history.slice(0, -1),
      };
    });
  }

  function restart() {
    trackToyEvent('toy_restarted', story.slug, {
      endingsFound: game.seenEndings.length,
    });
    setGame(createInitialGame(game.seenEndings));
  }

  return (
    <main className={styles.toyPage}>
      <div className={styles.utilityBar}>
        <Link href="/toys" className={styles.backLink}>
          <span aria-hidden="true">←</span> Toys
        </Link>
        <div className={styles.utilityActions}>
          <button
            className={styles.utilityButton}
            disabled={game.history.length === 0}
            onClick={rewind}
            type="button"
          >
            Back
          </button>
          <button
            className={styles.utilityButton}
            onClick={restart}
            type="button"
          >
            Restart
          </button>
        </div>
      </div>

      <header className={styles.titleBlock}>
        <h1>{story.title}</h1>
        <p>Original interactive fiction by {story.author ?? 'Austen Tucker'}</p>
      </header>

      <div className={styles.gameShell}>
        <article
          aria-labelledby="current-passage"
          className={styles.storyColumn}
        >
          <h2
            className={styles.passageLabel}
            id="current-passage"
            ref={passageHeadingRef}
            tabIndex={-1}
          >
            {game.passage.id === 'Start' ? 'Tonight' : game.passage.id}
          </h2>

          <div className={styles.passageLayout}>
            {location ? (
              <PassageArtwork
                key={`${location.id}-${reaction.id}`}
                location={location}
                reaction={reaction}
              />
            ) : null}

            <div className={styles.narrativeColumn}>
              <PassageText body={game.passage.body} />

              {game.passage.externalLinks.length > 0 ? (
                <div className={styles.referenceLinks}>
                  {game.passage.externalLinks.map((link) => (
                    <a
                      href={link.href}
                      key={link.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {game.passage.choices.length > 0 ? (
                <div
                  aria-label="What do you do?"
                  className={styles.choices}
                  role="group"
                >
                  {game.passage.choices.map((choice, index) => (
                    <button
                      className={styles.choiceButton}
                      key={`${choice.target}-${choice.label}`}
                      onClick={() => choose(choice.target)}
                      type="button"
                    >
                      <span className={styles.choiceNumber} aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{choice.label}</span>
                      <ChevronIcon />
                    </button>
                  ))}
                </div>
              ) : (
                <ToyEndingPanel
                  endingTitle={
                    endingTitles[game.passage.id] ?? game.passage.id
                  }
                  endingsFound={game.seenEndings.length}
                  onRestart={() =>
                    setGame((current) =>
                      createInitialGame(current.seenEndings),
                    )
                  }
                  toyId={story.slug}
                />
              )}
            </div>
          </div>
        </article>

        <aside aria-label="Date plan status" className={styles.statusRail}>
          <section className={styles.moneyStatus} aria-live="polite">
            <span>Money left</span>
            <strong>${dollars}</strong>
          </section>

          <section className={styles.planStatus}>
            <h2>Plans</h2>
            {purchasedPlans.length > 0 ? (
              <ul>
                {purchasedPlans.map(([flag, label]) => (
                  <li key={flag}>
                    <span className={styles.checkIcon} aria-hidden="true">
                      ✓
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing booked yet.</p>
            )}
          </section>

          <section className={styles.preparationStatus}>
            <h2>What you know</h2>
            <ul>
              <li>
                <span aria-hidden="true">◇</span>
                Tess said yes.
              </li>
              {game.variables.CoolWithAMakeover === true ? (
                <li>
                  <span aria-hidden="true">✓</span>
                  Tess trusts the library route.
                </li>
              ) : null}
              {game.variables.Painted === true ? (
                <li>
                  <span aria-hidden="true">✓</span>
                  Tess chose an ink-and-paint look.
                </li>
              ) : null}
            </ul>
          </section>

          <section>
            <h2>Outcomes found</h2>
            <p>{game.seenEndings.length}/{outcomeCount}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
