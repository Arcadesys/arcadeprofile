'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  enterPassage,
  type PreparedPassage,
  type RawTwineStory,
  type TwineVariables,
} from '@/lib/toys/twine-engine';
import styles from './IllustratedTwineGame.module.css';

export type ToyCharacter = {
  src: string;
  alt: string;
  label: string;
  width: number;
  height: number;
};

export type ToyScene = {
  id: string;
  title: string;
  src: string;
  alt: string;
  passages: readonly string[];
  character?: ToyCharacter;
};

export type ToyPassageMedia = {
  passage: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

type GameSnapshot = {
  passage: PreparedPassage;
  variables: TwineVariables;
};

type GameState = GameSnapshot & {
  history: GameSnapshot[];
  seenEndings: string[];
  visited: string[];
};

type IllustratedTwineGameProps = {
  story: RawTwineStory;
  scenes: readonly ToyScene[];
  openingLabel: string;
  primary: string;
  secondary: string;
  primaryRgb: string;
  endingTitles?: Readonly<Record<string, string>>;
  versePassages?: ReadonlySet<string>;
  media?: readonly ToyPassageMedia[];
  progressLabel?: string;
  sideNotes?: readonly string[];
};

type ToyTheme = CSSProperties & {
  '--toy-primary': string;
  '--toy-secondary': string;
  '--toy-primary-rgb': string;
};

function createInitialGame(
  story: RawTwineStory,
  seenEndings: string[] = [],
): GameState {
  const entered = enterPassage(story, story.start, {});
  return {
    ...entered,
    history: [],
    seenEndings,
    visited: [story.start],
  };
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
      {paragraphs.map((paragraph, index) => {
        const lines = verse
          ? paragraph.split('\n')
          : [paragraph.replace(/\s*\n\s*/g, ' ')];

        return (
          <p key={`${paragraph.slice(0, 32)}-${index}`}>
            {lines.map((line, lineIndex) => (
              <Fragment key={`${line.slice(0, 24)}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineFormatting(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function SceneArtwork({ scene }: { scene: ToyScene }) {
  return (
    <figure className={styles.sceneArtwork}>
      <div className={styles.sceneFrame}>
        <Image
          alt={scene.alt}
          className={styles.sceneImage}
          fill
          priority
          sizes="(max-width: 900px) calc(100vw - 2rem), 840px"
          src={scene.src}
        />
        {scene.character ? (
          <Image
            alt={scene.character.alt}
            className={styles.characterLayer}
            height={scene.character.height}
            priority
            sizes="(max-width: 620px) 48vw, (max-width: 900px) 40vw, 360px"
            src={scene.character.src}
            width={scene.character.width}
          />
        ) : null}
        {scene.character ? (
          <span className={styles.characterBadge}>{scene.character.label}</span>
        ) : null}
      </div>
      <figcaption>{scene.title}</figcaption>
    </figure>
  );
}

export default function IllustratedTwineGame({
  story,
  scenes,
  openingLabel,
  primary,
  secondary,
  primaryRgb,
  endingTitles = {},
  versePassages = new Set<string>(),
  media = [],
  progressLabel = 'Story explored',
  sideNotes = [],
}: IllustratedTwineGameProps) {
  const [game, setGame] = useState<GameState>(() => createInitialGame(story));
  const passageHeadingRef = useRef<HTMLHeadingElement>(null);

  const ending =
    game.passage.choices.length === 0 ? game.passage.id : undefined;
  const scene =
    scenes.find(({ passages }) => passages.includes(game.passage.id)) ??
    scenes[0];
  const passageMedia = media.find(
    ({ passage }) => passage === game.passage.id,
  );

  useEffect(() => {
    passageHeadingRef.current?.focus();
  }, [game.passage.id]);

  useEffect(() => {
    if (!ending) return;

    setGame((current) =>
      current.seenEndings.includes(ending)
        ? current
        : { ...current, seenEndings: [...current.seenEndings, ending] },
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
    setGame((current) => createInitialGame(story, current.seenEndings));
  }

  const theme = {
    '--toy-primary': primary,
    '--toy-secondary': secondary,
    '--toy-primary-rgb': primaryRgb,
  } as ToyTheme;

  return (
    <main className={styles.toyPage} style={theme}>
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
            {game.passage.id === story.start
              ? openingLabel
              : game.passage.id}
          </h2>

          {scene ? <SceneArtwork key={scene.id} scene={scene} /> : null}

          <PassageText
            body={game.passage.body}
            verse={versePassages.has(game.passage.id)}
          />

          {passageMedia ? (
            <figure className={styles.passageMedia}>
              <Image
                alt={passageMedia.alt}
                height={passageMedia.height}
                src={passageMedia.src}
                width={passageMedia.width}
              />
              {passageMedia.caption ? (
                <figcaption>{passageMedia.caption}</figcaption>
              ) : null}
            </figure>
          ) : null}

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
                Ending — {endingTitles[game.passage.id] ?? game.passage.id}
              </p>
              <p className={styles.endingCount}>
                {game.seenEndings.length} ending
                {game.seenEndings.length === 1 ? '' : 's'} found
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

        <aside aria-label="Story status" className={styles.statusRail}>
          <section className={styles.progressStatus} aria-live="polite">
            <span>{progressLabel}</span>
            <strong>
              {game.visited.length}
              <small>/{story.passages.length}</small>
            </strong>
          </section>

          <section>
            <h2>Current scene</h2>
            <p>{scene?.title ?? game.passage.id}</p>
          </section>

          {sideNotes.length > 0 ? (
            <section>
              <h2>Keep in mind</h2>
              <ul>
                {sideNotes.map((note) => (
                  <li key={note}>
                    <span aria-hidden="true">◇</span>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2>Endings found</h2>
            <p>{game.seenEndings.length || 'None yet.'}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
