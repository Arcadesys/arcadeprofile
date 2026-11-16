import Image from 'next/image';
import Link from 'next/link';

import release from '@/data/toys/message-in-a-bottle-release.json';
import { TOY_CATALOG } from '@/data/toys/catalog';
import { buildToyMetadata } from '@/lib/toys/metadata';
import shelfStyles from '../toys.module.css';
import styles from './module.module.css';

const toy = TOY_CATALOG.find(({ id }) => id === 'message-in-a-bottle')!;

export const metadata = buildToyMetadata({
  title: toy.title,
  description: toy.description,
  path: toy.href,
  image: toy.image,
});

export default function MessageInABottlePage() {
  return (
    <main className={`${shelfStyles.page} ${styles.module}`}>
      <Link className={styles.back} href="/toys">← All toys</Link>
      <header className={shelfStyles.header}>
        <p className={styles.eyebrow}>Free tabletop adventure · Savage Worlds</p>
        <h1>Message in a Bottle</h1>
        <p>
          Chicago is trapped in a bottle. The way out runs through impossible
          offices, an old cyclotron, and a world that is still becoming itself.
        </p>
      </header>

      {toy.image ? (
        <Image
          className={styles.hero}
          src={toy.image.src}
          alt={toy.image.alt}
          width={toy.image.width}
          height={toy.image.height}
          sizes="(max-width: 1012px) calc(100vw - 32px), 980px"
          priority
        />
      ) : null}

      <section aria-labelledby="bring-your-table" className={styles.intro}>
        <h2 id="bring-your-table">Bring your table.</h2>
        <p>
          An illustrated campaign guide for game masters, with the secrets laid
          out alongside the scenes: characters, Wild Cards and Extras, branching
          encounters, stat blocks, and possible endings. Read it, run it, or take
          the pieces that suit your group.
        </p>
        <aside className={styles.notice} aria-labelledby="gm-spoilers">
          <h3 id="gm-spoilers">GM spoilers throughout</h3>
          <p>
            The guide reveals the campaign’s twists and endings. If you hope to
            play a character in it, let your game master read ahead.
          </p>
        </aside>
        <div className={styles.actions}>
          <a className={styles.primary} href={release.guidePath}>Read the illustrated module →</a>
          <a href={release.download.url}>
            Download the illustrated guide (ZIP)
          </a>
        </div>
      </section>

      <section aria-labelledby="inside-module" className={styles.details}>
        <h2 id="inside-module">At the table</h2>
        <ul>
          <li>Eight sessions of campaign material, with the GM’s view alongside the story.</li>
          <li>A shifting Thompson Center labyrinth and an old Chicago Cyclotron encounter with maps, clocks, and consequences.</li>
          <li>Character profiles and optional stat blocks to help you run the encounters.</li>
          <li>Original plans distinguished from new, unplaytested rules and unresolved gaps.</li>
        </ul>
        <p>
          Requires the <em>Savage Worlds Adventure Edition</em> core rules.
          This is a free fan module; the guide includes the fan notice and credits.
        </p>
      </section>

      <section aria-labelledby="mcp-companion" className={styles.details}>
        <h2 id="mcp-companion">Keep the session moving with MCP</h2>
        <p>
          An optional Game Master companion brings the campaign into a
          compatible desktop AI client. Pull up scene briefings, track revealed
          clues and pressure clocks, record your table’s decisions, and get
          session recaps with less page-flipping.
        </p>
        <p>
          It runs locally on your computer, and the GM directs every change.
          It follows the 24-scene campaign outline; use the illustrated guide
          for the expanded maze and cyclotron mechanics.
        </p>
        <div className={styles.actions}>
          <a href="https://github.com/Arcadesys/message-in-a-bottle/blob/main/mcp/README.md">
            Set up the MCP companion →
          </a>
        </div>
      </section>

      <footer className={styles.credits}>
        <p>
          Created with human-directed AI tools assisting writing, illustration,
          and production. The module records which material came from the
          campaign plans and which was developed for this edition.
        </p>
        <a href="https://github.com/Arcadesys/message-in-a-bottle">Source and credits on GitHub →</a>
      </footer>
    </main>
  );
}
