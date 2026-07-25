'use client';

import Link from 'next/link';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import storyJson from '@/data/toys/butterfly-exe.json';
import {
  enterPassage,
  type PreparedPassage,
  type RawTwineStory,
  type TwineVariables,
} from '@/lib/toys/twine-engine';
import { BUTTERFLY_ENDINGS, getButterflyEnding } from '@/lib/toys/butterfly-endings';
import styles from './ButterflyGame.module.css';

const story = storyJson as RawTwineStory;

// The poem is the one passage where the line breaks are the writing.
const VERSE_PASSAGES = new Set(['Poem']);

type GameSnapshot = {
  passage: PreparedPassage;
  variables: TwineVariables;
};

type GameState = GameSnapshot & {
  history: GameSnapshot[];
  seenEndings: string[];
};

function createInitialGame(seenEndings: string[] = []): GameState {
  const entered = enterPassage(story, story.start, {});
  return { ...entered, history: [], seenEndings };
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className={styles.chevron} viewBox="0 0 24 24">
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

function renderLines(paragraph: string): ReactNode {
  const lines = paragraph.split('\n');

  return lines.map((line, index) => (
    <Fragment key={`${line.slice(0, 24)}-${index}`}>
      {index > 0 ? <br /> : null}
      {renderInlineFormatting(line)}
    </Fragment>
  ));
}

function PassageText({ body, verse }: { body: string; verse: boolean }) {
  const paragraphs = useMemo(
    () =>
      body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [body],
  );

  return (
    <div className={styles.prose} data-verse={verse ? 'true' : undefined}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 32)}-${index}`}>
          {renderLines(paragraph)}
        </p>
      ))}
    </div>
  );
}

export default function ButterflyGame() {
  const [game, setGame] = useState<GameState>(() => createInitialGame());
  const passageHeadingRef = useRef<HTMLHeadingElement>(null);

  const ending =
    game.passage.choices.length === 0 ? getButterflyEnding(game.passage.id) : null;

  useEffect(() => {
    passageHeadingRef.current?.focus();
  }, [game.passage.id]);

  useEffect(() => {
    if (!ending) return;

    setGame((current) =>
      current.seenEndings.includes(ending.id)
        ? current
        : { ...current, seenEndings: [...current.seenEndings, ending.id] },
    );
  }, [ending]);

  function choose(target: string) {
    setGame((current) => {
      const next = enterPassage(story, target, current.variables);
      return {
        ...current,
        ...next,
        history: [
          ...current.history,
          { passage: current.passage, variables: current.variables },
        ],
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
    setGame((current) => createInitialGame(current.seenEndings));
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
        <p>Original interactive fiction by {story.author ?? 'Austen Crowder'}</p>
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
            {game.passage.id === 'Start' ? 'The night before' : game.passage.id}
          </h2>

          <PassageText
            body={game.passage.body}
            verse={VERSE_PASSAGES.has(game.passage.id)}
          />

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
            <div className={styles.endingActions}>
              <p className={styles.endingLabel}>
                Ending — {ending?.title ?? 'The story ends here.'}
              </p>
              <p className={styles.endingCount}>
                {game.seenEndings.length} of {BUTTERFLY_ENDINGS.length} endings
                found
              </p>
              <button
                className={styles.choiceButton}
                onClick={restart}
                type="button"
              >
                <span>Start over</span>
                <ChevronIcon />
              </button>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
